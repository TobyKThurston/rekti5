import { useEffect, useState } from 'react';

const BINANCE_WS = 'wss://stream.binance.com:9443/ws/btcusdt@trade';

export function useBtcPrice() {
  const [btcPrice, setBtcPrice] = useState(null);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let destroyed = false;
    let delay = 1000;

    function connect() {
      ws = new WebSocket(BINANCE_WS);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setBtcPrice(parseFloat(data.p));
      };

      ws.onopen = () => {
        delay = 1000;
      };

      ws.onclose = () => {
        if (destroyed) return;
        console.warn(`[binance] WS closed, reconnecting in ${delay}ms…`);
        reconnectTimer = setTimeout(() => {
          connect();
          delay = Math.min(delay * 2, 30_000);
        }, delay);
      };

      ws.onerror = (err) => {
        console.error('[binance] WS error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return btcPrice;
}
