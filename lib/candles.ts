import postgres from 'postgres';

export interface CandleRow {
  time: number;  // Unix seconds (bucket_start)
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function upsertCandle(
  sql: ReturnType<typeof postgres>,
  symbol: string,
  bucketStartSec: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Promise<void> {
  await sql`
    INSERT INTO candles (symbol, bucket_start, open, high, low, close)
    VALUES (
      ${symbol},
      to_timestamp(${bucketStartSec}),
      ${open},
      ${high},
      ${low},
      ${close}
    )
    ON CONFLICT (symbol, bucket_start)
    DO UPDATE SET
      high       = GREATEST(candles.high, EXCLUDED.high),
      low        = LEAST(candles.low, EXCLUDED.low),
      close      = EXCLUDED.close,
      updated_at = NOW()
  `;
}
