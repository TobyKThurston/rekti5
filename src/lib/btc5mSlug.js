import { BTC_5M_SLUG_PREFIX } from '../config/networks';

// Returns the slug for the 5-minute window that contains the given timestamp (ms).
// Each market starts at a 300-second UTC-aligned boundary: floor(unixSec / 300) * 300
export function btc5mSlug(nowMs = Date.now()) {
  const windowStart = Math.floor(nowMs / 1000 / 300) * 300;
  return `${BTC_5M_SLUG_PREFIX}-${windowStart}`;
}
