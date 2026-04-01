-- Run once against your Postgres database before deploying.
-- Safe to re-run (all statements are idempotent).

CREATE TABLE IF NOT EXISTS candles (
  id           BIGSERIAL PRIMARY KEY,
  symbol       TEXT             NOT NULL,
  bucket_start TIMESTAMPTZ      NOT NULL,
  open         DOUBLE PRECISION NOT NULL,
  high         DOUBLE PRECISION NOT NULL,
  low          DOUBLE PRECISION NOT NULL,
  close        DOUBLE PRECISION NOT NULL,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT candles_symbol_bucket_key UNIQUE (symbol, bucket_start)
);

CREATE INDEX IF NOT EXISTS candles_symbol_bucket_idx
  ON candles (symbol, bucket_start DESC);

-- ─── Optional: raw tick debugging tables ────────────────────────────────────
-- Run these manually if you want per-tick observability.
-- They are NOT required for the candle pipeline to function.

-- CREATE TABLE IF NOT EXISTS raw_ticks (
--   id           BIGSERIAL    PRIMARY KEY,
--   symbol       TEXT         NOT NULL,
--   price        DOUBLE PRECISION NOT NULL,
--   tick_ts      TIMESTAMPTZ  NOT NULL,
--   bucket_start TIMESTAMPTZ  NOT NULL,
--   source       TEXT,
--   received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS raw_ticks_symbol_ts_idx ON raw_ticks (symbol, tick_ts DESC);

-- CREATE TABLE IF NOT EXISTS rejected_ticks (
--   id           BIGSERIAL    PRIMARY KEY,
--   symbol       TEXT         NOT NULL,
--   price        DOUBLE PRECISION,
--   tick_ts      TIMESTAMPTZ,
--   bucket_start TIMESTAMPTZ,
--   reason       TEXT         NOT NULL,
--   detail       TEXT,
--   received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS rejected_ticks_symbol_ts_idx ON rejected_ticks (symbol, tick_ts DESC);
