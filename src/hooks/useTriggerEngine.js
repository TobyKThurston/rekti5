import { useEffect, useRef } from 'react';
import { Side, OrderType } from '@polymarket/clob-client';

export function useTriggerEngine({ market, positionsRef, setPositions, clobClient, countdown }) {
  const executingRef = useRef(new Set()); // atomic protection against double-fire

  useEffect(() => {
    if (!market) return;
    // Safety: no new exits within 10 seconds of market expiry
    if (countdown != null && countdown < 10) return;

    const positions = positionsRef.current;

    for (const order of positions) {
      if (order.status !== 'OPEN_POSITION') continue;
      if (!order.stopLoss && !order.takeProfit) continue;
      if (executingRef.current.has(order.id)) continue;

      const currentBid = order.side === 'YES'
        ? parseFloat(market.bestBid)
        : parseFloat(market.bestNoBid ?? 0);

      let triggerType = null;
      if (order.stopLoss   && currentBid <= order.stopLoss)   triggerType = 'STOP';
      if (order.takeProfit && currentBid >= order.takeProfit) triggerType = 'TAKE_PROFIT';
      if (!triggerType) continue;

      // Mark executing synchronously before any async work
      executingRef.current.add(order.id);
      setPositions(prev => prev.map(p =>
        p.id === order.id && p.status === 'OPEN_POSITION'
          ? { ...p, status: 'EXECUTING' }
          : p
      ));

      triggerExit(order, triggerType);
    }

    async function triggerExit(order, type) {
      try {
        const tokenId = order.side === 'YES' ? market.yesTokenId : market.noTokenId;
        const bestBid = order.side === 'YES'
          ? parseFloat(market.bestBid)
          : parseFloat(market.bestNoBid ?? 0);
        const aggressivePrice = Math.max(0.01, parseFloat((bestBid - 0.01).toFixed(4)));

        if (clobClient) {
          // Real order
          const exitOrder = await clobClient.createOrder({
            tokenID: tokenId,
            price:   aggressivePrice,
            side:    Side.SELL,
            size:    order.size,
          });
          await clobClient.postOrder(exitOrder, OrderType.GTC);
        }
        // Cancel the sibling trigger (OCO)
        setPositions(prev => prev.map(p =>
          p.id === order.id
            ? { ...p, status: 'FILLED', stopLoss: undefined, takeProfit: undefined }
            : p
        ));

        console.log(`[trigger] ${type} fired for ${order.id} at ${aggressivePrice}`);
      } catch (e) {
        console.error('[trigger] exit failed:', e);
        // Revert to OPEN_POSITION so it can retry on next tick
        setPositions(prev => prev.map(p =>
          p.id === order.id ? { ...p, status: 'OPEN_POSITION' } : p
        ));
      } finally {
        executingRef.current.delete(order.id);
      }
    }
  }, [market]);
}
