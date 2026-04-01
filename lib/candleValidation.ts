// ─── Configuration ────────────────────────────────────────────────────────────

export interface CandleIngestionConfig {
  /**
   * Reject any tick that moves more than this percentage from the previous
   * accepted price. Default 1.5 — generous enough for fast BTC markets but
   * catches feed glitches that slip through the priceEngine's multi-feed filter.
   */
  outlierThresholdPct: number;

  /**
   * Warn if a completed candle's (high - low) range exceeds this % of open.
   * Default 3.0 — a 3% BTC range in a single minute is extraordinary.
   */
  sanityRangePct: number;

  /**
   * Warn if the new candle's close differs from the previous candle's close
   * by more than this %. Default 2.0.
   */
  sanityClosePct: number;

  /**
   * If true, skip writing candles that fail sanity checks entirely.
   * If false (default), write them anyway but log a clear warning.
   */
  skipOnSanityFailure: boolean;
}

export const CANDLE_CONFIG: CandleIngestionConfig = {
  outlierThresholdPct: 1.5,
  sanityRangePct: 3.0,
  sanityClosePct: 2.0,
  skipOnSanityFailure: false,
};

// ─── Bucket helpers ───────────────────────────────────────────────────────────

/**
 * Deterministic floor-to-minute bucket boundary.
 * Input: wall-clock ms. Output: Unix seconds (matches DB bucket_start).
 */
export function getBucketStart(timestampMs: number): number {
  return Math.floor(timestampMs / 60_000) * 60;
}

// ─── Price validation ─────────────────────────────────────────────────────────

/** Returns true if the value is a usable, positive, finite number. */
export function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

export type RejectionReason =
  | 'invalid_price'  // null, NaN, ≤0, Infinity, non-number
  | 'outlier'        // % move from previous accepted price exceeds threshold
  | 'late_finalized'; // tick belongs to a bucket already written to DB

export interface TickRejection {
  reason: RejectionReason;
  price: unknown;
  prevPrice: number | null;
  timestampMs: number;
  bucketStart: number;
  detail?: string;
}

/**
 * Validate a single incoming price tick.
 *
 * Returns null when accepted.
 * Returns a TickRejection when the tick should be discarded.
 */
export function validateTick(opts: {
  price: unknown;
  timestampMs: number;
  prevAcceptedPrice: number | null;
  finalizedBuckets: ReadonlySet<number>;
  config: CandleIngestionConfig;
}): TickRejection | null {
  const { price, timestampMs, prevAcceptedPrice, finalizedBuckets, config } = opts;
  const bucketStart = getBucketStart(timestampMs);

  // 1. Basic validity
  if (!isValidPrice(price)) {
    return {
      reason: 'invalid_price',
      price,
      prevPrice: prevAcceptedPrice,
      timestampMs,
      bucketStart,
    };
  }

  // 2. Late tick for a bucket we already finalized and sent to the DB
  if (finalizedBuckets.has(bucketStart)) {
    return {
      reason: 'late_finalized',
      price,
      prevPrice: prevAcceptedPrice,
      timestampMs,
      bucketStart,
      detail: `bucket ${bucketStart} already finalized`,
    };
  }

  // 3. Outlier — only checked once we have a reference price
  if (prevAcceptedPrice !== null) {
    const changePct = (Math.abs(price - prevAcceptedPrice) / prevAcceptedPrice) * 100;
    if (changePct > config.outlierThresholdPct) {
      return {
        reason: 'outlier',
        price,
        prevPrice: prevAcceptedPrice,
        timestampMs,
        bucketStart,
        detail: `${changePct.toFixed(3)}% move exceeds ${config.outlierThresholdPct}% threshold`,
      };
    }
  }

  return null; // accepted
}

// ─── Candle state ─────────────────────────────────────────────────────────────

export interface CandleState {
  bucketStart: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

// ─── Sanity checks before DB write ───────────────────────────────────────────

export interface SanityResult {
  ok: boolean;
  warnings: string[];
}

/**
 * Run sanity checks on a completed candle before persisting.
 * Catches internally inconsistent OHLC values and improbable ranges.
 */
export function checkCandleSanity(
  candle: CandleState,
  prevCandle: CandleState | null,
  config: CandleIngestionConfig,
): SanityResult {
  const warnings: string[] = [];

  // OHLC internal consistency
  if (candle.high < candle.open || candle.high < candle.close) {
    warnings.push(
      `[sanity] high ${candle.high} < open ${candle.open} or close ${candle.close}`,
    );
  }
  if (candle.low > candle.open || candle.low > candle.close) {
    warnings.push(
      `[sanity] low ${candle.low} > open ${candle.open} or close ${candle.close}`,
    );
  }

  // Range sanity
  const rangePct = ((candle.high - candle.low) / candle.open) * 100;
  if (rangePct > config.sanityRangePct) {
    warnings.push(
      `[sanity] range ${rangePct.toFixed(2)}% exceeds ${config.sanityRangePct}% ` +
        `(h=${candle.high} l=${candle.low} o=${candle.open})`,
    );
  }

  // Close drift vs previous candle
  if (prevCandle) {
    const closeDriftPct = (Math.abs(candle.close - prevCandle.close) / prevCandle.close) * 100;
    if (closeDriftPct > config.sanityClosePct) {
      warnings.push(
        `[sanity] close drift ${closeDriftPct.toFixed(2)}% ` +
          `(prev ${prevCandle.close} → now ${candle.close})`,
      );
    }
  }

  return { ok: warnings.length === 0, warnings };
}
