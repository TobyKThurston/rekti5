import { useEffect, useState } from 'react';

const KRAKEN_WS = 'wss://ws.kraken.com/v2';

export function useBtcPrice() {
  const [btcPrice, setBtcPrice] = useState(null);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let destroyed = false;
    let delay = 1000;

    function connect() {
      ws = new WebSocket(KRAKEN_WS);

      ws.onopen = () => {
        delay = 1000;
        ws.send(JSON.stringify({
          method: 'subscribe',
          params: { channel: 'ticker', symbol: ['BTC/USD'] },
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.channel === 'ticker' && msg.data?.length) {
          const { bid, ask } = msg.data[0];
          setBtcPrice((bid + ask) / 2);
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        console.warn(`[kraken] WS closed, reconnecting in ${delay}ms…`);
        reconnectTimer = setTimeout(() => {
          connect();
          delay = Math.min(delay * 2, 30_000);
        }, delay);
      };

      ws.onerror = (err) => {
        console.error('[kraken] WS error:', err);
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
