import { BTC_5M_SLUG_PREFIX } from '@/config/networks';

export function btc5mSlug(nowMs: number = Date.now()): string {
  const windowStart = Math.floor(nowMs / 1000 / 300) * 300;
  return `${BTC_5M_SLUG_PREFIX}-${windowStart}`;
}
