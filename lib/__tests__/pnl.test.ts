import { describe, it, expect } from 'vitest';
import { calcPnl } from '../pnl';

describe('calcPnl', () => {
  it('normal trade — profit', () => {
    expect(calcPnl(100, 0.5, 0.75)).toBe(50);
  });

  it('breakeven', () => {
    expect(calcPnl(100, 0.5, 0.5)).toBe(0);
  });

  it('full loss', () => {
    expect(calcPnl(100, 0.5, 0)).toBe(-100);
  });

  it('small size near full profit', () => {
    const result = calcPnl(1, 0.01, 0.99);
    expect(result).toBeCloseTo(98, 0);
  });

  it('never NaN or Infinity for valid inputs', () => {
    const result = calcPnl(100, 0.5, 0.75);
    expect(Number.isFinite(result)).toBe(true);
    expect(Number.isNaN(result)).toBe(false);
  });
});
