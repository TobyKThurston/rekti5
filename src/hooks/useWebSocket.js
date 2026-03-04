import { useEffect, useRef } from 'react';

export function useWebSocket({ market, setMarket }) {
  const wsRef            = useRef(null);
  const wsReconnectDelay = useRef(1_000);
  const wsReconnectTimer = useRef(null);
  const pendingSubscription = useRef(null);

  // Connect to bridge server on mount
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:3001');

      ws.onopen = () => {
        console.log('[ws] Connected to market server');
        wsReconnectDelay.current = 1_000;
        wsRef.current = ws;
        if (pendingSubscription.current) {
          ws.send(JSON.stringify({ type: 'subscribe', ...pendingSubscription.current }));
        }
      };

      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type !== 'update' && msg.type !== 'state') return;
          const d2 = msg.data;
          const yesMid = (d2.bestYesBid + d2.bestYesAsk) / 2;
          const noMid  = 1 - yesMid;
          setMarket((prev) => prev ? {
            ...prev,
            yesPrice:  yesMid.toFixed(4),
            noPrice:   noMid.toFixed(4),
            bestBid:   d2.bestYesBid,
            bestAsk:   d2.bestYesAsk,
            bestNoBid: d2.bestNoBid,
            bestNoAsk: d2.bestNoAsk,
            spread:    d2.spreadYes != null ? String(d2.spreadYes) : prev.spread,
            lastUpdated: d2.timestamp,
          } : prev);
        } catch (e) { console.error('[ws] parse error:', e); }
      };

      ws.onclose = () => {
        console.log(`[ws] Disconnected. Retry in ${wsReconnectDelay.current}ms`);
        wsRef.current = null;
        wsReconnectTimer.current = setTimeout(() => {
          wsReconnectDelay.current = Math.min(wsReconnectDelay.current * 2, 30_000);
          connect();
        }, wsReconnectDelay.current);
      };

      ws.onerror = (e) => console.error('[ws] error:', e);
      wsRef.current = ws;
    };

    connect();
    return () => {
      clearTimeout(wsReconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  // Subscribe to market whenever yesTokenId changes
  useEffect(() => {
    if (!market?.yesTokenId) return;
    const sub = { yesTokenId: market.yesTokenId, noTokenId: market.noTokenId };
    pendingSubscription.current = sub;
    const send = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', ...sub }));
      }
    };
    const t = setTimeout(send, 100);
    return () => clearTimeout(t);
  }, [market?.yesTokenId]);
}
