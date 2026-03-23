import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useTriggerEngine } from '../useTriggerEngine';
import type { Market, Position } from '@/types';

const baseMarket: Market = {
  question: 'BTC test',
  yesTokenId: 'yes-token',
  noTokenId: 'no-token',
  yesPrice: '0.5',
  noPrice: '0.5',
  tickSize: 0.01,
  negRisk: false,
  bestBid: '0.45',
  bestAsk: '0.55',
  bestNoBid: '0.45',
  spread: '0.10',
};

const openPosition = (overrides: Partial<Position> = {}): Position => ({
  id: 'pos-1',
  side: 'YES',
  size: 10,
  entry: 0.5,
  tokenId: 'yes-token',
  status: 'OPEN_POSITION',
  ...overrides,
});

function makeHookArgs(positions: Position[], marketOverrides: Partial<Market> = {}) {
  const setPositions = vi.fn();
  const showToast = vi.fn();
  const positionsRef = { current: positions };
  const clobClient = {
    createOrder: vi.fn().mockResolvedValue({}),
    postOrder: vi.fn().mockResolvedValue({}),
  };
  return {
    market: { ...baseMarket, ...marketOverrides },
    positionsRef,
    setPositions,
    clobClient,
    countdown: 60,
    showToast,
  };
}

describe('useTriggerEngine', () => {
  it('stop-loss fires when currentBid <= stopLoss', async () => {
    const position = openPosition({ stopLoss: 0.5 });
    const args = makeHookArgs([position], { bestBid: '0.45' }); // 0.45 <= 0.5

    await act(async () => {
      renderHook(() => useTriggerEngine(args));
      // Allow async triggerExit to complete
      await new Promise(r => setTimeout(r, 10));
    });

    expect(args.setPositions).toHaveBeenCalled();
    // First call marks EXECUTING
    const firstCall = args.setPositions.mock.calls[0][0];
    const execResult = firstCall([position]);
    expect(execResult[0].status).toBe('EXECUTING');
  });

  it('take-profit fires when currentBid >= takeProfit', async () => {
    const position = openPosition({ takeProfit: 0.4 });
    const args = makeHookArgs([position], { bestBid: '0.45' }); // 0.45 >= 0.4

    await act(async () => {
      renderHook(() => useTriggerEngine(args));
      await new Promise(r => setTimeout(r, 10));
    });

    expect(args.setPositions).toHaveBeenCalled();
    const firstCall = args.setPositions.mock.calls[0][0];
    const execResult = firstCall([position]);
    expect(execResult[0].status).toBe('EXECUTING');
  });

  it('does not fire when bid is between stop and take-profit', async () => {
    const position = openPosition({ stopLoss: 0.3, takeProfit: 0.7 });
    const args = makeHookArgs([position], { bestBid: '0.5' }); // neither triggered

    await act(async () => {
      renderHook(() => useTriggerEngine(args));
      await new Promise(r => setTimeout(r, 10));
    });

    expect(args.setPositions).not.toHaveBeenCalled();
  });

  it('countdown < 10 blocks execution', async () => {
    const position = openPosition({ stopLoss: 0.5 });
    const args = { ...makeHookArgs([position], { bestBid: '0.45' }), countdown: 5 };

    await act(async () => {
      renderHook(() => useTriggerEngine(args));
      await new Promise(r => setTimeout(r, 10));
    });

    expect(args.setPositions).not.toHaveBeenCalled();
  });

  it('on catch: position reverts to OPEN_POSITION and showToast is called', async () => {
    const position = openPosition({ stopLoss: 0.5 });
    const args = makeHookArgs([position], { bestBid: '0.45' });
    args.clobClient.createOrder = vi.fn().mockRejectedValue(new Error('network error'));

    await act(async () => {
      renderHook(() => useTriggerEngine(args));
      await new Promise(r => setTimeout(r, 50));
    });

    expect(args.showToast).toHaveBeenCalledWith('error', 'SL/TP exit failed — position still open');

    // Find the revert call — it sets status back to OPEN_POSITION
    const revertCall = args.setPositions.mock.calls.find((call: unknown[]) => {
      const fn = call[0] as (prev: Position[]) => Position[];
      const result = fn([{ ...position, status: 'EXECUTING' as const }]);
      return result[0].status === 'OPEN_POSITION';
    });
    expect(revertCall).toBeDefined();
  });
});
