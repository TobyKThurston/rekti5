interface FeedState {
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  recvTs: number;
}

type PriceCallback = (price: number) => void;

const STALE_MS = 2000;
const WATCHDOG_MS = 5000;
const MAX_BACKOFF_MS = 30_000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

class PriceEngine {
  private feeds = new Map<string, FeedState | null>();
  private subscribers = new Set<PriceCallback>();
  private lastPrice: number | null = null;
  private started = false;

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.connectCoinbase();
    this.connectKraken();
    this.connectBinanceUS();
  }

  subscribe(cb: PriceCallback): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  getPrice(): number | null {
    return this.lastPrice;
  }

  private notify(price: number): void {
    this.subscribers.forEach((cb) => cb(price));
  }

  private handleFeedUpdate(
    feedId: string,
    bid: number,
    ask: number,
    bidSize: number,
    askSize: number,
  ): void {
    this.feeds.set(feedId, { bid, ask, bidSize, askSize, recvTs: Date.now() });
    this.aggregate();
  }

  private aggregate(): void {
    const now = Date.now();
    const valid: { feedId: string; micro: number }[] = [];

    for (const [feedId, state] of this.feeds.entries()) {
      if (!state || now - state.recvTs >= STALE_MS) continue;
      const { bid, ask, bidSize, askSize } = state;
      const totalSize = bidSize + askSize;
      if (totalSize <= 0) continue;
      const micro = (ask * bidSize + bid * askSize) / totalSize;
      valid.push({ feedId, micro });
    }

    let price: number | null = null;

    if (valid.length >= 2) {
      const micros = valid.map((v) => v.micro);
      const med = median(micros);
      const filtered = valid.filter((v) => Math.abs(v.micro - med) / med <= 0.005);
      if (filtered.length > 0) {
        price = median(filtered.map((v) => v.micro));
      }
    } else if (valid.length === 1) {
      price = valid[0].micro;
    }

    if (price === null) {
      price = this.lastPrice;
    }

    if (price !== null) {
      this.lastPrice = price;
      this.notify(price);
    }
  }

  // ─── Coinbase Advanced Trade ───────────────────────────────────────────────

  private connectCoinbase(delay = 1000): void {
    let ws: WebSocket;
    let watchdog: ReturnType<typeof setTimeout>;
    let dead = false;

    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        console.warn('[coinbase] watchdog: no message — reconnecting');
        ws?.close();
      }, WATCHDOG_MS);
    };

    const reconnect = (d: number) => {
      clearTimeout(watchdog);
      if (dead) return;
      console.warn(`[coinbase] reconnecting in ${d}ms`);
      setTimeout(() => this.connectCoinbase(Math.min(d * 2, MAX_BACKOFF_MS)), d);
    };

    ws = new WebSocket('wss://advanced-trade-ws.coinbase.com');
    this.feeds.set('coinbase', null);

    ws.onopen = () => {
      delay = 1000;
      resetWatchdog();
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          product_ids: ['BTC-USD'],
          channel: 'ticker',
        }),
      );
    };

    ws.onmessage = (evt) => {
      resetWatchdog();
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.channel === 'ticker' && msg.events?.length) {
          for (const event of msg.events) {
            for (const ticker of event.tickers ?? []) {
              const bid = parseFloat(ticker.best_bid);
              const ask = parseFloat(ticker.best_ask);
              const bidSize = parseFloat(ticker.best_bid_quantity);
              const askSize = parseFloat(ticker.best_ask_quantity);
              if (bid > 0 && ask > 0 && bidSize >= 0 && askSize >= 0) {
                this.handleFeedUpdate('coinbase', bid, ask, bidSize || 1, askSize || 1);
              }
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      this.feeds.set('coinbase', null);
      reconnect(delay);
    };

    ws.onerror = () => ws.close();

    // expose cleanup for potential future use
    void { dead, cleanup: () => { dead = true; clearTimeout(watchdog); ws?.close(); } };
  }

  // ─── Kraken v2 ────────────────────────────────────────────────────────────

  private connectKraken(delay = 1000): void {
    let ws: WebSocket;
    let watchdog: ReturnType<typeof setTimeout>;
    let dead = false;

    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        console.warn('[kraken] watchdog: no message — reconnecting');
        ws?.close();
      }, WATCHDOG_MS);
    };

    const reconnect = (d: number) => {
      clearTimeout(watchdog);
      if (dead) return;
      console.warn(`[kraken] reconnecting in ${d}ms`);
      setTimeout(() => this.connectKraken(Math.min(d * 2, MAX_BACKOFF_MS)), d);
    };

    ws = new WebSocket('wss://ws.kraken.com/v2');
    this.feeds.set('kraken', null);

    ws.onopen = () => {
      delay = 1000;
      resetWatchdog();
      ws.send(
        JSON.stringify({
          method: 'subscribe',
          params: { channel: 'ticker', symbol: ['BTC/USD'], event_trigger: 'bbo' },
        }),
      );
    };

    ws.onmessage = (evt) => {
      resetWatchdog();
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.channel === 'ticker' && msg.data?.length) {
          for (const d of msg.data) {
            const bid = d.bid as number;
            const ask = d.ask as number;
            const bidSize = (d.bid_qty as number) || 1;
            const askSize = (d.ask_qty as number) || 1;
            if (bid > 0 && ask > 0) {
              this.handleFeedUpdate('kraken', bid, ask, bidSize, askSize);
            }
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      this.feeds.set('kraken', null);
      reconnect(delay);
    };

    ws.onerror = () => ws.close();

    void { dead, cleanup: () => { dead = true; clearTimeout(watchdog); ws?.close(); } };
  }

  // ─── Binance.US ───────────────────────────────────────────────────────────

  private connectBinanceUS(delay = 1000): void {
    let ws: WebSocket;
    let watchdog: ReturnType<typeof setTimeout>;
    let dead = false;

    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        console.warn('[binance.us] watchdog: no message — reconnecting');
        ws?.close();
      }, WATCHDOG_MS);
    };

    const reconnect = (d: number) => {
      clearTimeout(watchdog);
      if (dead) return;
      console.warn(`[binance.us] reconnecting in ${d}ms`);
      setTimeout(() => this.connectBinanceUS(Math.min(d * 2, MAX_BACKOFF_MS)), d);
    };

    ws = new WebSocket('wss://stream.binance.us:9443/ws/btcusdt@bookTicker');
    this.feeds.set('binance', null);

    ws.onopen = () => {
      delay = 1000;
      resetWatchdog();
    };

    ws.onmessage = (evt) => {
      resetWatchdog();
      try {
        const msg = JSON.parse(evt.data as string);
        // bookTicker: { b: bestBid, B: bestBidQty, a: bestAsk, A: bestAskQty }
        const bid = parseFloat(msg.b);
        const ask = parseFloat(msg.a);
        const bidSize = parseFloat(msg.B) || 1;
        const askSize = parseFloat(msg.A) || 1;
        if (bid > 0 && ask > 0) {
          this.handleFeedUpdate('binance', bid, ask, bidSize, askSize);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      this.feeds.set('binance', null);
      reconnect(delay);
    };

    ws.onerror = () => ws.close();

    void { dead, cleanup: () => { dead = true; clearTimeout(watchdog); ws?.close(); } };
  }
}

export const priceEngine = new PriceEngine();
