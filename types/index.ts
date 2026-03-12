// ── Shared types ──────────────────────────────────────────────────────────────

export interface Market {
  question: string;
  yesTokenId: string;
  noTokenId: string;
  yesPrice: string;
  noPrice: string;
  tickSize: number | string;
  negRisk: boolean;
  bestBid: string | number;
  bestAsk: string | number;
  bestNoBid?: string | number;
  bestNoAsk?: string | number;
  spread: string;
  lastUpdated?: number;
}

export type PositionStatus = 'OPEN_POSITION' | 'EXECUTING' | 'FILLED' | 'CANCELLED';

export interface Position {
  id: string;
  side: 'YES' | 'NO';
  size: number;
  entry: number;
  tokenId: string;
  stopLoss?: number;
  takeProfit?: number;
  status: PositionStatus;
  orderId?: string;
  currentPrice?: string;
  pnl?: string;
  positive?: boolean;
}

export interface MarketHistoryEntry {
  slug: string;
  result: 'YES' | 'NO';
  windowMs: number;
}

export type ToastType = 'success' | 'error';

export interface ToastState {
  type: ToastType;
  msg: string;
}

export interface ApiCreds {
  key: string;
  secret: string;
  passphrase: string;
}

// ── Window augmentations ──────────────────────────────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    TradingView?: {
      widget: new (config: Record<string, unknown>) => TradingViewWidget;
    };
    updatePriceToBeat?: (price: number) => void;
  }

  interface TradingViewWidget {
    onChartReady: (cb: () => void) => void;
    chart: () => TradingViewChart;
    remove: () => void;
  }

  interface TradingViewChart {
    createShape: (
      point: { price: number },
      options: Record<string, unknown>,
    ) => Promise<unknown> | unknown;
    removeEntity: (id: unknown) => void;
    onIntervalChanged: () => { subscribe: (ctx: null, cb: () => void) => void };
    onSymbolChanged: () => { subscribe: (ctx: null, cb: () => void) => void };
  }
}
