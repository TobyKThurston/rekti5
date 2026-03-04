export function calcPnl(sz, entry, currentPrice) {
  return sz * (currentPrice / entry) - sz;
}
