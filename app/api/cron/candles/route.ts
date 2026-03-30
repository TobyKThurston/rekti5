/**
 * Vercel Cron — runs every minute.
 * Fetches the just-completed 1-minute BTC/USD candle from Kraken's public
 * REST API and upserts it into Postgres so history is persisted server-side
 * even when no browser client is open.
 *
 * Kraken OHLC entry shape: [time, open, high, low, close, vwap, volume, count]
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { upsertCandle } from '@/lib/candles';

export const runtime = 'nodejs';

type KrakenEntry = [number, string, string, string, string, string, string, number];

interface KrakenOhlcResponse {
  error: string[];
  result?: {
    XXBTZUSD?: KrakenEntry[];
    last?: number;
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  // Protect the endpoint: Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch ~3 minutes of 1-min OHLC so we always capture the just-completed bar
    const since = Math.floor(Date.now() / 1000) - 180;
    const res = await fetch(
      `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1&since=${since}`,
      { cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Kraken HTTP ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as KrakenOhlcResponse;

    if (data.error?.length) {
      return NextResponse.json({ error: data.error }, { status: 502 });
    }

    const entries = data.result?.XXBTZUSD ?? [];
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    // Kraken always returns the current incomplete candle last — skip anything
    // within the current minute boundary.
    const cutoffSec = Math.floor(Date.now() / 1000 / 60) * 60;
    const completed = entries.filter(([time]) => time < cutoffSec);

    if (completed.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const sql = getDb();
    for (const [time, open, high, low, close] of completed) {
      await upsertCandle(sql, 'BTCUSD', time, Number(open), Number(high), Number(low), Number(close));
    }

    return NextResponse.json({ ok: true, count: completed.length });
  } catch (err) {
    console.error('[cron/candles]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
