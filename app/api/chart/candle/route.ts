import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { upsertCandle } from '@/lib/candles';

export const runtime = 'nodejs';

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

    if (!bucketStart || !open || !high || !low || !close) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sql = getDb();
    await upsertCandle(sql, symbol, bucketStart, open, high, low, close);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chart/candle]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
