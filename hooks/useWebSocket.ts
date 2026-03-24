import { useEffect, useRef } from 'react';
import type { Market } from '@/types';

const CLOB_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

interface MarketState {
  bestYesBid: number;
  bestYesAsk: number;
  bestNoBid:  number;
  bestNoAsk:  number;
  spreadYes?: number;
  spreadNo?:  number;
  timestamp:  number;
}

interface UseWebSocketProps {
  market: Market | null;
  setMarket: React.Dispatch<React.SetStateAction<Market | null>>;
}

export function useWebSocket({ market, setMarket }: UseWebSocketProps) {
  const wsRef            = useRef<WebSocket | null>(null);
  const wsReconnectDelay = useRef(1_000);
  const wsReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSubscription = useRef<{ yesTokenId: string; noTokenId: string } | null>(null);
  const heartbeatRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingUpdateRef = useRef<MarketState | null>(null);
  const rafRef           = useRef<number | null>(null);
  const marketStateRef   = useRef<MarketState>({
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

      if (updated) {
        state.timestamp = Date.now();
        pendingUpdateRef.current = { ...state };
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const s = pendingUpdateRef.current;
            if (!s) return;
            pendingUpdateRef.current = null;
            setMarket((prev) => prev ? {
              ...prev,
              yesPrice:    s.bestYesBid.toFixed(4),
              noPrice:     s.bestNoBid.toFixed(4),
              bestBid:     s.bestYesBid,
              bestAsk:     s.bestYesAsk,
              bestNoBid:   s.bestNoBid,
              bestNoAsk:   s.bestNoAsk,
              spread:      s.spreadYes != null ? String(s.spreadYes) : prev.spread,
              lastUpdated: s.timestamp,
            } : prev);
          });
        }
      }
    };

    connect();
    return () => {
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
      if (heartbeatRef.current)     clearInterval(heartbeatRef.current);
      if (rafRef.current)           cancelAnimationFrame(rafRef.current);
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
  }, [market?.yesTokenId]); // eslint-disable-line react-hooks/exhaustive-deps
}
