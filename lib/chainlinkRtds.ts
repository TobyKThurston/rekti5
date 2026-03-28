/**
 * Polymarket RTDS — Chainlink BTC/USD resolution engine
 *
 * THIS MODULE IS EXCLUSIVELY FOR RESOLUTION.
 * Do NOT use it for live charting or trading UI.
 * Those use lib/priceEngine.ts (multi-exchange aggregator).
 *
 * Resolution rule: first tick where tick.timestamp >= boundary.
 * Never interpolate, never go backwards.
 */

const RTDS_URL = 'wss://ws-live-data.polymarket.com';
const TICK_RETENTION_MS = 30 * 60 * 1000; // 30 minutes in memory
const WATCHDOG_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;

export interface ChainlinkTick {
  price: number;
  timestamp: number;  // payload.timestamp — Chainlink's own clock (ms)
  receivedAt: number; // Date.now() — local receive time, for debugging only
}

export interface WindowResolution {
  startTimeMs: number;
  startPrice: number;
  startTimestamp: number;
  startDelay: number; // startTimestamp - startTimeMs

  endTimeMs: number;
  endPrice: number | null;
  endTimestamp: number | null;
  endDelay: number | null; // endTimestamp - endTimeMs

  result: 'UP' | 'DOWN' | null; // null = end data not yet available
}

type TickCallback = (tick: ChainlinkTick) => void;

class ChainlinkRtdsEngine {
  /** Time-ordered, deduplicated list of received ticks. */
  private ticks: ChainlinkTick[] = [];
  private subscribers = new Set<TickCallback>();
  private started = false;

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Idempotent. Call once from a React hook. */
  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.connect();
  }

  /** Subscribe to new ticks. Returns unsubscribe fn. */
  subscribe(cb: TickCallback): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  /** Read-only snapshot of buffered ticks. */
  getTicks(): readonly ChainlinkTick[] {
    return this.ticks;
  }

  /**
   * First tick where tick.timestamp >= targetMs.
   * Returns null if no qualifying tick is in the buffer yet.
   */
  getFirstTickAtOrAfter(targetMs: number): ChainlinkTick | null {
    for (const tick of this.ticks) {
      if (tick.timestamp >= targetMs) return tick;
    }
    return null;
  }

  /**
   * Deterministically resolve a 5-minute window.
   * Logs full debug output as specified in the architecture.
   */
  resolveWindow(startMs: number, endMs: number): WindowResolution {
    const startTick = this.getFirstTickAtOrAfter(startMs);
    const endTick   = this.getFirstTickAtOrAfter(endMs);

    const resolution: WindowResolution = {
      startTimeMs:    startMs,
      startPrice:     startTick?.price      ?? 0,
      startTimestamp: startTick?.timestamp  ?? 0,
      startDelay:     startTick ? startTick.timestamp - startMs : 0,

      endTimeMs:      endMs,
      endPrice:       endTick?.price     ?? null,
      endTimestamp:   endTick?.timestamp ?? null,
      endDelay:       endTick ? endTick.timestamp - endMs : null,

      result: null,
    };

    if (startTick && endTick) {
      resolution.result = endTick.price >= startTick.price ? 'UP' : 'DOWN';
    }

    console.debug('[chainlink-rtds] resolve', {
      startTimeMs:    resolution.startTimeMs,
      startPrice:     resolution.startPrice,
      startTimestamp: resolution.startTimestamp,
      startDelay:     resolution.startDelay,
      endTimeMs:      resolution.endTimeMs,
      endPrice:       resolution.endPrice,
      endTimestamp:   resolution.endTimestamp,
      endDelay:       resolution.endDelay,
      result:         resolution.result,
    });

    return resolution;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private addTick(price: number, timestamp: number): void {
    // Deduplicate: keep first occurrence of each timestamp
    if (this.ticks.some((t) => t.timestamp === timestamp)) return;

    const tick: ChainlinkTick = { price, timestamp, receivedAt: Date.now() };
    this.ticks.push(tick);

    // Ticks arrive in order from RTDS so no sort needed.
    // Prune anything older than the retention window.
    const cutoff = Date.now() - TICK_RETENTION_MS;
    while (this.ticks.length > 0 && this.ticks[0].receivedAt < cutoff) {
      this.ticks.shift();
    }

    this.subscribers.forEach((cb) => cb(tick));
  }

  private connect(delay = 1000): void {
    if (typeof window === 'undefined') return;

    let watchdog: ReturnType<typeof setTimeout>;
    let pingInterval: ReturnType<typeof setInterval>;
    let closed = false;

    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (closed) return;
        console.warn('[chainlink-rtds] watchdog: no message in 10 s — reconnecting');
        ws.close();
      }, WATCHDOG_MS);
    };

    const ws = new WebSocket(RTDS_URL);

    ws.onopen = () => {
      delay = 1000; // reset backoff on successful connect
      console.info('[chainlink-rtds] connected — subscribing to crypto_prices_chainlink');
      ws.send(JSON.stringify({
        action: 'subscribe',
        subscriptions: [
          {
            topic:   'crypto_prices_chainlink',
            type:    '*',
            filters: '{"symbol":"btc/usd"}',
          },
        ],
      }));
      resetWatchdog();
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 5_000);
    };

    ws.onmessage = (evt) => {
      resetWatchdog();
      try {
        const msg = JSON.parse(evt.data as string) as {
          topic?: string;
          payload?: { symbol?: string; timestamp?: number; value?: number };
        };
        if (
          msg.topic === 'crypto_prices_chainlink' &&
          msg.payload?.symbol === 'btc/usd' &&
          typeof msg.payload.value     === 'number' &&
          typeof msg.payload.timestamp === 'number'
        ) {
          this.addTick(msg.payload.value, msg.payload.timestamp);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      closed = true;
      clearTimeout(watchdog);
      clearInterval(pingInterval);
      console.warn(`[chainlink-rtds] disconnected — reconnecting in ${delay} ms`);
      setTimeout(() => this.connect(Math.min(delay * 2, MAX_BACKOFF_MS)), delay);
    };

    ws.onerror = () => ws.close();
  }
}

export const chainlinkRtds = new ChainlinkRtdsEngine();
