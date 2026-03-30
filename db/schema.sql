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
