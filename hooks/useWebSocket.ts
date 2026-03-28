import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Market, RecentTrade, WhaleTrade } from '@/types';

const CLOB_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

interface MarketState {
  bestYesBid: number;
  bestYesAsk: number;
  bestNoBid:  number;
  bestNoAsk:  number;
  spreadYes?: number;
  spreadNo?:  number;
}

interface UseWebSocketProps {
  market: Market | null;
  setMarket: React.Dispatch<React.SetStateAction<Market | null>>;
}

export function useWebSocket({ market, setMarket }: UseWebSocketProps): { recentTrades: RecentTrade[]; whaleTrades: WhaleTrade[] } {
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [whaleTrades, setWhaleTrades] = useState<WhaleTrade[]>([]);
  const whaleWindowRef   = useRef<number>(Math.floor(Date.now() / 300_000));
  const wsRef            = useRef<WebSocket | null>(null);
  const wsReconnectDelay = useRef(1_000);
  const wsReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSubscription = useRef<{ yesTokenId: string; noTokenId: string } | null>(null);
  const prevYesTokenIdRef   = useRef<string | null>(null);
  const heartbeatRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketStateRef   = useRef<MarketState>({
    bestYesBid: 0, bestYesAsk: 0,
    bestNoBid:  0, bestNoAsk:  0,
    spreadYes: undefined,
    spreadNo:  undefined,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('polymarket_whales');
      if (!raw) return;
      const stored = JSON.parse(raw) as { window: number; trades: WhaleTrade[] };
      if (stored.window === Math.floor(Date.now() / 300_000)) setWhaleTrades(stored.trades);
    } catch {}
  }, []);

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
          const parsed = JSON.parse(data as string);
          const msgs = Array.isArray(parsed) ? parsed : [parsed];
          for (const msg of msgs) processMessage(msg);
        } catch (e) { console.error('[ws] parse error:', e); }
      };

      ws.onclose = () => {
        console.log(`[ws] Disconnected. Retry in ${wsReconnectDelay.current}ms`);
        wsRef.current = null;
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
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
          const msg = JSON.parse(e.data as string);
          if (msg === 'pong' || msg?.type === 'pong') pongReceived = true;
        } catch {}
      });
      heartbeatRef.current = setInterval(() => {
        if (!pongReceived) {
          console.warn('[ws] No pong — reconnecting…');
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          ws.close();
          return;
        }
        pongReceived = false;
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 30_000);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processMessage = (msg: any) => {
      const state = marketStateRef.current;
      const yesId = pendingSubscription.current?.yesTokenId;
      const noId  = pendingSubscription.current?.noTokenId;
      let updated = false;

      if (msg.event_type === 'book') {
        const isYes = msg.asset_id === yesId;
        const isNo  = msg.asset_id === noId;
        if (!isYes && !isNo) return;
        const bestBid = msg.bids?.length ? Math.max(...msg.bids.map((b: { price: string }) => parseFloat(b.price))) : null;
        const bestAsk = msg.asks?.length ? Math.min(...msg.asks.map((a: { price: string }) => parseFloat(a.price))) : null;
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

      // Trade events (have size) take priority; last_trade_price is a fallback
      if (msg.event_type === 'trade' || msg.event_type === 'last_trade_price') {
        const isYes = msg.asset_id === yesId;
        const isNo  = msg.asset_id === noId;
        if (isYes || isNo) {
          const price = parseFloat(msg.price);
          const size  = msg.size != null ? parseFloat(msg.size) : 0;
          if (!isNaN(price) && price > 0) {
            const trade: RecentTrade = {
              id:   msg.id ?? `${msg.event_type}-${Date.now()}-${Math.random()}`,
              side: isYes ? 'YES' : 'NO',
              price,
              size,
              ts:   msg.timestamp ? parseInt(msg.timestamp) : Date.now(),
            };
            setRecentTrades((prev) => {
              // dedupe by id
              if (prev.length > 0 && prev[0].id === trade.id) return prev;
              return [trade, ...prev].slice(0, 8);
            });

            if (size >= 500) {
              const rawAddr: string | undefined =
                msg.maker_orders?.[0]?.owner ?? msg.taker_order?.owner ?? undefined;
              const address = rawAddr
                ? `${rawAddr.slice(0, 6)}…${rawAddr.slice(-4)}`
                : undefined;
              const whale: WhaleTrade = { id: trade.id, side: trade.side, size, price, address, ts: trade.ts };
              const currentWindow = Math.floor(trade.ts / 300_000);
              setWhaleTrades(prev => {
                const isDupe = prev.some(p =>
                  p.side === whale.side &&
                  p.size === whale.size &&
                  p.price === whale.price &&
                  Math.abs(p.ts - whale.ts) < 2_000
                );
                if (isDupe) return prev;
                const base = currentWindow !== whaleWindowRef.current ? [] : prev;
                whaleWindowRef.current = currentWindow;
                return [whale, ...base].slice(0, 20);
              });
            }
          }
        }
      }

      if (updated) {
        const s = marketStateRef.current;
        flushSync(() => {
          setMarket((prev) => prev ? {
            ...prev,
            yesPrice:    s.bestYesBid.toFixed(4),
            noPrice:     s.bestNoBid.toFixed(4),
            bestBid:     s.bestYesBid,
            bestAsk:     s.bestYesAsk,
            bestNoBid:   s.bestNoBid,
            bestNoAsk:   s.bestNoAsk,
            spread:      s.spreadYes != null ? String(s.spreadYes) : prev.spread,
            lastUpdated: Date.now(),
          } : prev);
        });
      }
    };

    connect();

    // Reset whale trades at 5-minute window boundaries even with no incoming trades
    const windowCheckInterval = setInterval(() => {
      const w = Math.floor(Date.now() / 300_000);
      if (w !== whaleWindowRef.current) {
        whaleWindowRef.current = w;
        setWhaleTrades([]);
      }
    }, 10_000);

    return () => {
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
      if (heartbeatRef.current)     clearInterval(heartbeatRef.current);
      clearInterval(windowCheckInterval);
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    };
    setRecentTrades([]);
    if (prevYesTokenIdRef.current !== null && prevYesTokenIdRef.current !== market.yesTokenId) {
      setWhaleTrades([]);
    }
    prevYesTokenIdRef.current = market.yesTokenId;
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
  }, [market?.yesTokenId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist whale trades to localStorage so they survive refresh within the same window
  useEffect(() => {
    try {
      const currentWindow = Math.floor(Date.now() / 300_000);
      localStorage.setItem('polymarket_whales', JSON.stringify({ window: currentWindow, trades: whaleTrades }));
    } catch {}
  }, [whaleTrades]);

  return { recentTrades, whaleTrades };
}
