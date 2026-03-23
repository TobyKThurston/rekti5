import { describe, it, expect } from 'vitest';
import { btc5mSlug } from '../btc5mSlug';
import { BTC_5M_SLUG_PREFIX } from '@/config/networks';

describe('btc5mSlug', () => {
  it('returns a string starting with BTC_5M_SLUG_PREFIX', () => {
    const slug = btc5mSlug(Date.now());
    expect(slug.startsWith(BTC_5M_SLUG_PREFIX)).toBe(true);
  });

  it('two timestamps in the same 5-min window produce the same slug', () => {
    const base = 1_700_000_000_000; // arbitrary aligned ms
    const windowStart = Math.floor(base / 300_000) * 300_000;
    const t1 = windowStart + 1000;
    const t2 = windowStart + 250_000;
    expect(btc5mSlug(t1)).toBe(btc5mSlug(t2));
  });

  it('two timestamps in different windows produce different slugs', () => {
    const base = 1_700_000_000_000;
    const windowStart = Math.floor(base / 300_000) * 300_000;
    const t1 = windowStart + 1000;
    const t2 = windowStart + 300_000 + 1000; // next window
    expect(btc5mSlug(t1)).not.toBe(btc5mSlug(t2));
  });
});
