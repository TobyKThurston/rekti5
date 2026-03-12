import { useEffect, useState } from 'react';
import { btc5mSlug } from '@/lib/btc5mSlug';
import type { Market, ToastType } from '@/types';

type ShowToast = (type: ToastType, msg: string) => void;

export function useMarket(showToast: ShowToast) {
  const [conditionIdInput, setConditionIdInput] = useState('');
  const [market, setMarket]                     = useState<Market | null>(null);
  const [marketLoading, setMarketLoading]       = useState(false);
  const [marketError, setMarketError]           = useState<string | null>(null);
  const [marketEndDate, setMarketEndDate]       = useState<string | null>(null);

  const loadMarket = async (explicitId?: string) => {
    const id = (explicitId !== undefined ? explicitId : conditionIdInput).trim();
    if (!id) { showToast('error', 'Enter a condition ID.'); return; }
    setMarketLoading(true);
    setMarketError(null);
    try {
      const res = await fetch(`/gamma-api/markets?conditionIds=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.length) throw new Error('Market not found.');
      const m = data[0];
      const tokenIds: string[] = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
      const prices: string[]   = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
      setMarket({
        question:   m.question,
        yesTokenId: tokenIds[0],
        noTokenId:  tokenIds[1],
        yesPrice:   prices[0],
        noPrice:    prices[1],
        tickSize:   m.orderPriceMinTickSize ?? '0.01',
        negRisk:    m.negRisk ?? false,
        bestBid:    m.bestBid ?? prices[0],
        bestAsk:    m.bestAsk ?? prices[0],
        spread:     m.spread  ?? '—',
      });
      if (m.endDate) setMarketEndDate(m.endDate);
      showToast('success', 'Market loaded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMarketError(msg);
      showToast('error', `Load failed: ${msg}`);
    } finally {
      setMarketLoading(false);
    }
  };

  const autoLoadMarket = async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const now = Date.now();
      const slugsToTry = [btc5mSlug(now), btc5mSlug(now - 300_000)];
      let loaded = false;

      for (const slug of slugsToTry) {
        const res = await fetch(`/gamma-api/events?slug=${slug}`);
        if (!res.ok) continue;
        const data = await res.json();
        const events = Array.isArray(data) ? data : [data];
        const m = events[0]?.markets?.find((mk: { active: boolean; acceptingOrders: boolean }) => mk.active && mk.acceptingOrders)
          ?? events[0]?.markets?.[0];
        if (!m) continue;
        const tokenIds: string[] = Array.isArray(m.clobTokenIds) ? m.clobTokenIds : JSON.parse(m.clobTokenIds);
        const prices: string[]   = Array.isArray(m.outcomePrices) ? m.outcomePrices : JSON.parse(m.outcomePrices);
        setMarket((prev) => {
          const same = prev?.yesTokenId === tokenIds[0];
          return {
            question:   m.question,
            yesTokenId: tokenIds[0],
            noTokenId:  tokenIds[1],
            yesPrice:   same && prev ? prev.yesPrice : prices[0],
            noPrice:    same && prev ? prev.noPrice  : prices[1],
            tickSize:   m.orderPriceMinTickSize ?? 0.01,
            negRisk:    m.negRisk ?? false,
            bestBid:    same && prev ? prev.bestBid : (m.bestBid ?? prices[0]),
            bestAsk:    same && prev ? prev.bestAsk : (m.bestAsk ?? prices[0]),
            spread:     same && prev ? prev.spread  : (m.spread ?? '—'),
          };
        });
        if (m.endDate) setMarketEndDate(m.endDate);
        loaded = true;
        break;
      }

      if (!loaded) throw new Error('No active BTC 5m market found.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMarketError(msg);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    autoLoadMarket();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conditionIdInput, setConditionIdInput,
    market, setMarket,
    marketLoading,
    marketError,
    marketEndDate,
    loadMarket,
    autoLoadMarket,
  };
}
