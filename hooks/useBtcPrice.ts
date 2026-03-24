import { useEffect, useRef, useState } from 'react';

const KRAKEN_WS      = 'wss://ws.kraken.com/v2';
const WATCHDOG_MS    = 5_000; // reconnect if no message in 5 s (heartbeat arrives every 1 s)
const POLL_MS        = 100;   // 10 updates/sec — real-time feel without overwhelming

export function useBtcPrice(): number | null {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const pendingRef  = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let watchdogTimer: ReturnType<typeof setTimeout>;
    let destroyed = false;
    let delay = 1000;

    function resetWatchdog() {
      clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        if (destroyed) return;
        console.warn('[kraken] watchdog: no message in 5 s — reconnecting…');
        ws?.close();
      }, WATCHDOG_MS);
    }

    function connect() {
      ws = new WebSocket(KRAKEN_WS);

      ws.onopen = () => {
        delay = 1000;
        resetWatchdog();
        ws.send(JSON.stringify({
          method: 'subscribe',
          params: { channel: 'trade', symbol: ['BTC/USD'] },
        }));
        intervalRef.current = setInterval(() => {
          const p = pendingRef.current;
          if (p !== null) { pendingRef.current = null; setBtcPrice(p); }
        }, POLL_MS);
      };

      ws.onmessage = (event) => {
        resetWatchdog();
        const msg = JSON.parse(event.data as string);
        if (msg.channel === 'trade' && msg.data?.length) {
          const last = msg.data[msg.data.length - 1] as { price: number };
          pendingRef.current = last.price;
        }
      };

      ws.onclose = () => {
        clearTimeout(watchdogTimer);
        clearInterval(intervalRef.current!); intervalRef.current = null;
        if (destroyed) return;
        console.warn(`[kraken] WS closed, reconnecting in ${delay}ms…`);
        reconnectTimer = setTimeout(() => {
          delay = Math.min(delay * 2, 30_000);
          connect();
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearTimeout(watchdogTimer);
      clearInterval(intervalRef.current!); intervalRef.current = null;
      ws?.close();
    };
  }, []);

  return btcPrice;
}
