import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { upsertCandle } from '@/lib/candles';
import { isValidPrice } from '@/lib/candleValidation';

export const runtime = 'nodejs';

// BTC-specific sanity bounds — update if BTC ever trades outside these
const BTC_MIN = 1_000;
const BTC_MAX = 10_000_000;

interface CandleBody {
  symbol?: string;
  bucketStart: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CandleBody;
    const { symbol = 'BTCUSD', bucketStart, open, high, low, close } = body;

    // ── Field presence (isValidPrice rejects null/NaN/0/negative/Infinity) ──
    if (
      !bucketStart ||
      !isValidPrice(open) ||
      !isValidPrice(high) ||
      !isValidPrice(low) ||
      !isValidPrice(close)
    ) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // ── OHLC geometric consistency ────────────────────────────────────────────
    if (high < open || high < close || low > open || low > close || high < low) {
      console.error('[chart/candle] OHLC consistency failure', { symbol, bucketStart, open, high, low, close });
      return NextResponse.json({ error: 'OHLC consistency failure' }, { status: 422 });
    }

    // ── Plausibility bounds ───────────────────────────────────────────────────
    if (high > BTC_MAX || low < BTC_MIN) {
      console.error('[chart/candle] price out of plausible range', { high, low });
      return NextResponse.json({ error: 'Price out of plausible range' }, { status: 422 });
    }

    const sql = getDb();
    await upsertCandle(sql, symbol, bucketStart, open, high, low, close);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chart/candle]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
