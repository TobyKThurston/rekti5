export function calcPnl(sz: number, entry: number, currentPrice: number): number {
  return sz * (currentPrice / entry) - sz;
}
