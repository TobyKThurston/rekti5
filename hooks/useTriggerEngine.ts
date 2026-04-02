import { useEffect, useRef } from 'react';
import { Side } from '@polymarket/clob-client';
import type { Market, Position, ToastType } from '@/types';

interface UseTriggerEngineProps {
  market: Market | null;
  positionsRef: React.RefObject<Position[]>;
  setPositions: React.Dispatch<React.SetStateAction<Position[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clobClient: any;
  countdown: number;
  showToast: (type: ToastType, msg: string) => void;
}

export function useTriggerEngine({
  market,
  positionsRef,
  setPositions,
  clobClient,
  countdown,
  showToast,
}: UseTriggerEngineProps) {
  const executingRef = useRef(new Set<string>());

  useEffect(() => {
    if (!market) return;
    if (countdown != null && countdown < 10) return;

    const positions = positionsRef.current ?? [];

    for (const order of positions) {
      if (order.status !== 'OPEN_POSITION') continue;
      if (!order.stopLoss && !order.takeProfit) continue;
      if (executingRef.current.has(order.id)) continue;

      const currentBid = order.side === 'YES'
        ? parseFloat(String(market.bestBid))
        : parseFloat(String(market.bestNoBid ?? 0));

      let triggerType: 'STOP' | 'TAKE_PROFIT' | null = null;
      if (order.stopLoss   && currentBid <= order.stopLoss)   triggerType = 'STOP';
      if (order.takeProfit && currentBid >= order.takeProfit) triggerType = 'TAKE_PROFIT';
      if (!triggerType) continue;

      executingRef.current.add(order.id);
      setPositions(prev => prev.map(p =>
        p.id === order.id && p.status === 'OPEN_POSITION'
          ? { ...p, status: 'EXECUTING' as const }
          : p
      ));

      triggerExit(order, triggerType);
    }

    async function triggerExit(order: Position, type: 'STOP' | 'TAKE_PROFIT') {
      try {
        const tokenId = order.side === 'YES' ? market!.yesTokenId : market!.noTokenId;
        const bestBid = order.side === 'YES'
          ? parseFloat(String(market!.bestBid))
          : parseFloat(String(market!.bestNoBid ?? 0));
        const tickSize = parseFloat(String(market!.tickSize));
        const aggressivePrice = Math.max(
          tickSize,
          parseFloat((Math.floor((bestBid - tickSize) / tickSize) * tickSize).toFixed(4)),
        );

        if (clobClient) {
          const exitOrder = await clobClient.createOrder(
            { tokenID: tokenId, price: aggressivePrice, side: Side.SELL, size: order.size },
            { tickSize: String(market!.tickSize) },
          );
          const apiCreds = JSON.parse(sessionStorage.getItem('clobApiCreds') ?? '{}');
          await fetch('/api/place-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedOrder: exitOrder, orderType: 'GTC', apiCreds }),
          });
        }
        setPositions(prev => prev.map(p =>
          p.id === order.id
            ? { ...p, status: 'FILLED' as const, stopLoss: undefined, takeProfit: undefined }
            : p
        ));

        console.log(`[trigger] ${type} fired for ${order.id} at ${aggressivePrice}`);
      } catch (e) {
        console.error('[trigger] exit failed:', e);
        showToast('error', 'SL/TP exit failed — position still open');
        setPositions(prev => prev.map(p =>
          p.id === order.id ? { ...p, status: 'OPEN_POSITION' as const } : p
        ));
      } finally {
        executingRef.current.delete(order.id);
      }
    }
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps
}
