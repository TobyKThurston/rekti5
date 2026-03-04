import { useEffect, useRef } from 'react';

const CLOB_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

export function useWebSocket({ market, setMarket }) {
  const wsRef            = useRef(null);
  const wsReconnectDelay = useRef(1_000);
  const wsReconnectTimer = useRef(null);
  const pendingSubscription = useRef(null);
  const heartbeatRef     = useRef(null);
  const marketStateRef   = useRef({
    bestYesBid: 0, bestYesAsk: 0,
    bestNoBid:  0, bestNoAsk:  0,
    spreadYes: undefined,
    spreadNo:  undefined,
    timestamp: 0,
  });

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(CLOB_WS_URL);

      ws.onopen = () => {
        console.log('[ws] Connected to Polymarket');
        wsReconnectDelay.current = 1_000;
        wsRef.current = ws;
        if (pendingSubscription.current) {
          ws.send(JSON.stringify({
            assets_ids: [pendingSubscription.current.yesTokenId, pendingSubscription.current.noTokenId],
            type: 'market',
            custom_feature_enabled: true,
          }));
        }
      };

      ws.onmessage = ({ data }) => {
        try {
          const parsed = JSON.parse(data);
          const msgs = Array.isArray(parsed) ? parsed : [parsed];
          for (const msg of msgs) processMessage(msg);
        } catch (e) { console.error('[ws] parse error:', e); }
      };

      ws.onclose = () => {
        console.log(`[ws] Disconnected. Retry in ${wsReconnectDelay.current}ms`);
        wsRef.current = null;
        clearInterval(heartbeatRef.current);
        wsReconnectTimer.current = setTimeout(() => {
          wsReconnectDelay.current = Math.min(wsReconnectDelay.current * 2, 30_000);
          connect();
        }, wsReconnectDelay.current);
      };

      ws.onerror = (e) => console.error('[ws] error:', e);
      wsRef.current = ws;

      // Heartbeat
      let pongReceived = true;
      ws.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg === 'pong' || msg?.type === 'pong') pongReceived = true;
        } catch {}
      });
      heartbeatRef.current = setInterval(() => {
        if (!pongReceived) {
          console.warn('[ws] No pong — reconnecting…');
          clearInterval(heartbeatRef.current);
          ws.close();
          return;
        }
        pongReceived = false;
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 30_000);
    };

    const processMessage = (msg) => {
      const state = marketStateRef.current;
      const yesId = pendingSubscription.current?.yesTokenId;
      const noId  = pendingSubscription.current?.noTokenId;
      let updated = false;

      if (msg.event_type === 'book') {
        const isYes = msg.asset_id === yesId;
        const isNo  = msg.asset_id === noId;
        if (!isYes && !isNo) return;
        const bestBid = msg.bids?.length ? Math.max(...msg.bids.map(b => parseFloat(b.price))) : null;
        const bestAsk = msg.asks?.length ? Math.min(...msg.asks.map(a => parseFloat(a.price))) : null;
        if (isYes) {
          if (bestBid != null) state.bestYesBid = bestBid;
          if (bestAsk != null) state.bestYesAsk = bestAsk;
          if (bestBid != null && bestAsk != null) state.spreadYes = +(bestAsk - bestBid).toFixed(4);
        } else {
          if (bestBid != null) state.bestNoBid = bestBid;
          if (bestAsk != null) state.bestNoAsk = bestAsk;
          if (bestBid != null && bestAsk != null) state.spreadNo = +(bestAsk - bestBid).toFixed(4);
        }
        updated = true;
      }

      if (msg.event_type === 'best_bid_ask') {
        const isYes = msg.asset_id === yesId;
        const isNo  = msg.asset_id === noId;
        if (!isYes && !isNo) return;
        const bestBid = msg.best_bid != null ? parseFloat(msg.best_bid) : null;
        const bestAsk = msg.best_ask != null ? parseFloat(msg.best_ask) : null;
        if (isYes) {
          if (bestBid != null) state.bestYesBid = bestBid;
          if (bestAsk != null) state.bestYesAsk = bestAsk;
          if (msg.spread != null) state.spreadYes = parseFloat(msg.spread);
        } else {
          if (bestBid != null) state.bestNoBid = bestBid;
          if (bestAsk != null) state.bestNoAsk = bestAsk;
          if (msg.spread != null) state.spreadNo = parseFloat(msg.spread);
        }
        updated = true;
      }

      if (msg.event_type === 'price_change') {
        for (const change of (msg.price_changes ?? [])) {
          const cIsYes = change.asset_id === yesId;
          const cIsNo  = change.asset_id === noId;
          if (!cIsYes && !cIsNo) continue;
          const bestBid = change.best_bid != null ? parseFloat(change.best_bid) : null;
          const bestAsk = change.best_ask != null ? parseFloat(change.best_ask) : null;
          if (cIsYes) {
            if (bestBid != null) state.bestYesBid = bestBid;
            if (bestAsk != null) state.bestYesAsk = bestAsk;
            if (bestBid != null && bestAsk != null) state.spreadYes = +(bestAsk - bestBid).toFixed(4);
          } else {
            if (bestBid != null) state.bestNoBid = bestBid;
            if (bestAsk != null) state.bestNoAsk = bestAsk;
            if (bestBid != null && bestAsk != null) state.spreadNo = +(bestAsk - bestBid).toFixed(4);
          }
          updated = true;
        }
      }

      if (msg.event_type === 'last_trade_price') {
        // not used for display but mark updated
        updated = false;
      }

      if (updated) {
        state.timestamp = Date.now();
        const yesMid = (state.bestYesBid + state.bestYesAsk) / 2;
        const noMid  = 1 - yesMid;
        setMarket((prev) => prev ? {
          ...prev,
          yesPrice:  yesMid.toFixed(4),
          noPrice:   noMid.toFixed(4),
          bestBid:   state.bestYesBid,
          bestAsk:   state.bestYesAsk,
          bestNoBid: state.bestNoBid,
          bestNoAsk: state.bestNoAsk,
          spread:    state.spreadYes != null ? String(state.spreadYes) : prev.spread,
          lastUpdated: state.timestamp,
        } : prev);
      }
    };

    connect();
    return () => {
      clearTimeout(wsReconnectTimer.current);
      clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, []);

  // Subscribe to market whenever yesTokenId changes
  useEffect(() => {
    if (!market?.yesTokenId) return;
    const sub = { yesTokenId: market.yesTokenId, noTokenId: market.noTokenId };
    pendingSubscription.current = sub;
    marketStateRef.current = {
      bestYesBid: 0, bestYesAsk: 0,
      bestNoBid:  0, bestNoAsk:  0,
      spreadYes: undefined,
      spreadNo:  undefined,
      timestamp: 0,
    };
    const send = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          assets_ids: [sub.yesTokenId, sub.noTokenId],
          type: 'market',
          custom_feature_enabled: true,
        }));
      }
    };
    const t = setTimeout(send, 100);
    return () => clearTimeout(t);
  }, [market?.yesTokenId]);
}
