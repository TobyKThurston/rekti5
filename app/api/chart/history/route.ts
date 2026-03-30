import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') ?? 'BTCUSD';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '500'), 1), 1000);

  try {
    const sql = getDb();
    const rows = await sql<{ bucket_start: Date; open: string; high: string; low: string; close: string }[]>`
      SELECT bucket_start, open, high, low, close
      FROM candles
      WHERE symbol = ${symbol}
      ORDER BY bucket_start DESC
      LIMIT ${limit}
    `;

    // Reverse so candles are ascending (oldest → newest) as lightweight-charts requires
    const candles = rows.reverse().map((row) => ({
      time: Math.floor(new Date(row.bucket_start).getTime() / 1000),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
    }));

    return NextResponse.json(candles);
  } catch (err) {
    console.error('[chart/history]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
