import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import cron from 'node-cron';
import { ethers } from 'ethers';

const FRONTEND_PORT      = 3001;
const CLOB_WS_URL        = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const MAX_BACKOFF_MS     = 30_000;

let marketState = {
  bestYesBid: 0, bestYesAsk: 0,
  bestNoBid:  0, bestNoAsk:  0,
  lastYesTrade: undefined,
  lastNoTrade:  undefined,
  spreadYes: undefined,
  spreadNo:  undefined,
  timestamp: 0,
};

let yesTokenId = null, noTokenId = null;
let polyWs = null, reconnectTimer = null, reconnectDelay = 1_000;

// ── SQLite DB ────────────────────────────────────────────────────────────────

const db = new Database('resolution_prices.db');
db.prepare(`CREATE TABLE IF NOT EXISTS resolution_prices (
  window_start INTEGER PRIMARY KEY,
  price REAL NOT NULL
)`).run();

// ── Chainlink price fetcher ───────────────────────────────────────────────────

const clProvider = new ethers.providers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com/');
const clContract = new ethers.Contract(
  '0xc907E116054Ad103354f2D350FD2514433D57F6f',
  ['function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'],
  clProvider);

async function fetchAndStore() {
  const windowStart = Math.floor(Date.now() / 300_000) * 300_000;
  if (db.prepare('SELECT 1 FROM resolution_prices WHERE window_start = ?').get(windowStart)) return;
  const [, answer] = await clContract.latestRoundData();
  const price = answer.toNumber() / 1e8;
  db.prepare('INSERT OR IGNORE INTO resolution_prices (window_start, price) VALUES (?, ?)').run(windowStart, price);
  console.log(`[chainlink] stored ${price} for window ${new Date(windowStart).toISOString()}`);
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

function handleHttp(req, res) {
  if (req.method === 'GET' && req.url === '/price-to-beat') {
    const row = db.prepare('SELECT * FROM resolution_prices ORDER BY window_start DESC LIMIT 1').get();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(row ?? null));
  } else {
    res.writeHead(404); res.end();
  }
}

// ── Frontend WS server ───────────────────────────────────────────────────────

const httpServer = http.createServer(handleHttp);
const wss = new WebSocketServer({ server: httpServer });
httpServer.listen(FRONTEND_PORT, () =>
  console.log(`[server] HTTP+WS on port ${FRONTEND_PORT}`));

cron.schedule('*/5 * * * *', () =>
  fetchAndStore().catch(e => console.error('[cron]', e.message)));
fetchAndStore().catch(e => console.error('[startup]', e.message));

wss.on('error', (err) => {
  console.error('[server] WSS error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('[server] Port 3001 in use — exiting so process manager can restart');
    process.exit(1);
  }
});

wss.on('connection', (client) => {
  console.log('[server] Frontend connected');
  if (marketState.timestamp > 0)
    client.send(JSON.stringify({ type: 'state', data: marketState }));

  client.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe') {
        console.log(`[server] subscribe yes=${msg.yesTokenId.slice(0, 8)}… no=${msg.noTokenId.slice(0, 8)}…`);
        subscribeToMarket(msg.yesTokenId, msg.noTokenId);
      }
    } catch (e) { console.error('[server] bad message:', e.message); }
  });
  client.on('close', () => console.log('[server] Frontend disconnected'));
});

// ── Market subscription ──────────────────────────────────────────────────────

function subscribeToMarket(yesId, noId) {
  yesTokenId = yesId;
  noTokenId  = noId;
  marketState = {
    bestYesBid: 0, bestYesAsk: 0,
    bestNoBid:  0, bestNoAsk:  0,
    lastYesTrade: undefined,
    lastNoTrade:  undefined,
    spreadYes: undefined,
    spreadNo:  undefined,
    timestamp: 0,
  };
  polyWs?.terminate();
  clearTimeout(reconnectTimer);
  reconnectDelay = 1_000;
  connectPolymarket();
}

function connectPolymarket() {
  if (!yesTokenId || !noTokenId) return;
  console.log('[polymarket] Connecting…');
  polyWs = new WebSocket(CLOB_WS_URL);

  polyWs.on('open', () => {
    reconnectDelay = 1_000;
    polyWs.send(JSON.stringify({
      assets_ids: [yesTokenId, noTokenId],
      type: 'market',
      custom_feature_enabled: true,
    }));
    console.log('[polymarket] Subscribed to market channel');
  });

  polyWs.on('message', (raw) => {
    try {
      const parsed = JSON.parse(raw.toString());
      const msgs = Array.isArray(parsed) ? parsed : [parsed];
      for (const msg of msgs) processMessage(msg);
    } catch (e) { console.error('[polymarket] parse error:', e.message); }
  });

  polyWs.on('close', (code) => {
    console.log(`[polymarket] Disconnected (code ${code}), scheduling reconnect…`);
    scheduleReconnect();
  });

  polyWs.on('error', (err) => {
    console.error('[polymarket] error:', err.message);
  });

  let pongReceived = true;
  polyWs.on('pong', () => { pongReceived = true; });

  const heartbeat = setInterval(() => {
    if (!pongReceived) {
      console.warn('[polymarket] No pong received — assuming dead connection, reconnecting…');
      clearInterval(heartbeat);
      polyWs.terminate();
      return;
    }
    pongReceived = false;
    if (polyWs.readyState === WebSocket.OPEN) polyWs.ping();
  }, 30_000);

  polyWs.on('close', () => clearInterval(heartbeat));
}

// ── Message processing ───────────────────────────────────────────────────────

function processMessage(msg) {
  let updated = false;
  const now = Date.now();

  if (msg.event_type === 'book') {
    const isYes = msg.asset_id === yesTokenId;
    const isNo  = msg.asset_id === noTokenId;
    if (!isYes && !isNo) return;
const bestBid = msg.bids?.length ? Math.max(...msg.bids.map(b => parseFloat(b.price))) : null;
    const bestAsk = msg.asks?.length ? Math.min(...msg.asks.map(a => parseFloat(a.price))) : null;
    if (isYes) {
      if (bestBid != null) marketState.bestYesBid = bestBid;
      if (bestAsk != null) marketState.bestYesAsk = bestAsk;
      if (bestBid != null && bestAsk != null) marketState.spreadYes = +(bestAsk - bestBid).toFixed(4);
    } else {
      if (bestBid != null) marketState.bestNoBid = bestBid;
      if (bestAsk != null) marketState.bestNoAsk = bestAsk;
      if (bestBid != null && bestAsk != null) marketState.spreadNo = +(bestAsk - bestBid).toFixed(4);
    }
    updated = true;
  }

  if (msg.event_type === 'best_bid_ask') {
    const isYes = msg.asset_id === yesTokenId;
    const isNo  = msg.asset_id === noTokenId;
    if (!isYes && !isNo) return;
    const bestBid = msg.best_bid != null ? parseFloat(msg.best_bid) : null;
    const bestAsk = msg.best_ask != null ? parseFloat(msg.best_ask) : null;
    if (isYes) {
      if (bestBid != null) marketState.bestYesBid = bestBid;
      if (bestAsk != null) marketState.bestYesAsk = bestAsk;
      if (msg.spread != null) marketState.spreadYes = parseFloat(msg.spread);
    } else {
      if (bestBid != null) marketState.bestNoBid = bestBid;
      if (bestAsk != null) marketState.bestNoAsk = bestAsk;
      if (msg.spread != null) marketState.spreadNo = parseFloat(msg.spread);
    }
    updated = true;
  }

  if (msg.event_type === 'price_change') {
    for (const change of (msg.price_changes ?? [])) {
      const cIsYes = change.asset_id === yesTokenId;
      const cIsNo  = change.asset_id === noTokenId;
      if (!cIsYes && !cIsNo) continue;
      const bestBid = change.best_bid != null ? parseFloat(change.best_bid) : null;
      const bestAsk = change.best_ask != null ? parseFloat(change.best_ask) : null;
      if (cIsYes) {
        if (bestBid != null) marketState.bestYesBid = bestBid;
        if (bestAsk != null) marketState.bestYesAsk = bestAsk;
        if (bestBid != null && bestAsk != null) marketState.spreadYes = +(bestAsk - bestBid).toFixed(4);
      } else {
        if (bestBid != null) marketState.bestNoBid = bestBid;
        if (bestAsk != null) marketState.bestNoAsk = bestAsk;
        if (bestBid != null && bestAsk != null) marketState.spreadNo = +(bestAsk - bestBid).toFixed(4);
      }
      updated = true;
    }
  }

  if (msg.event_type === 'last_trade_price') {
    const isYes = msg.asset_id === yesTokenId;
    const isNo  = msg.asset_id === noTokenId;
    if (!isYes && !isNo) return;
    const price = parseFloat(msg.price);
    if (!isNaN(price)) {
      if (isYes) marketState.lastYesTrade = price;
      else        marketState.lastNoTrade  = price;
      updated = true;
    }
  }

  if (updated) {
    marketState.timestamp = now;
    const yesMid = (marketState.bestYesBid + marketState.bestYesAsk) / 2;
    console.log(`[${new Date(now).toISOString()}] YES mid=${yesMid.toFixed(4)} NO mid=${(1 - yesMid).toFixed(4)}`);
    broadcast({ type: 'update', data: marketState });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function broadcast(payload) {
  const raw = JSON.stringify(payload);
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(raw); });
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_BACKOFF_MS);
    connectPolymarket();
  }, reconnectDelay);
}

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
