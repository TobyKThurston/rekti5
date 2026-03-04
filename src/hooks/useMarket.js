import { useEffect, useState } from 'react';
import { btc5mSlug } from '../lib/btc5mSlug';

export function useMarket(showToast) {
  const [conditionIdInput, setConditionIdInput] = useState('');
  const [market, setMarket]                     = useState(null);
  const [marketLoading, setMarketLoading]       = useState(false);
  const [marketError, setMarketError]           = useState(null);
  const [marketEndDate, setMarketEndDate]       = useState(null);

  const loadMarket = async (explicitId) => {
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
      const tokenIds = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
      const prices   = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
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
      setMarketError(err.message);
      showToast('error', `Load failed: ${err.message}`);
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
        const m = events[0]?.markets?.find((mk) => mk.active && mk.acceptingOrders)
          ?? events[0]?.markets?.[0];
        if (!m) continue;
        const tokenIds = Array.isArray(m.clobTokenIds) ? m.clobTokenIds : JSON.parse(m.clobTokenIds);
        const prices   = Array.isArray(m.outcomePrices) ? m.outcomePrices : JSON.parse(m.outcomePrices);
        setMarket((prev) => {
          const same = prev?.yesTokenId === tokenIds[0];
          return {
            question:   m.question,
            yesTokenId: tokenIds[0],
            noTokenId:  tokenIds[1],
            yesPrice:   same ? prev.yesPrice : prices[0],
            noPrice:    same ? prev.noPrice  : prices[1],
            tickSize:   m.orderPriceMinTickSize ?? 0.01,
            negRisk:    m.negRisk ?? false,
            bestBid:    same ? prev.bestBid : (m.bestBid ?? prices[0]),
            bestAsk:    same ? prev.bestAsk : (m.bestAsk ?? prices[0]),
            spread:     same ? prev.spread  : (m.spread ?? '—'),
          };
        });
        if (m.endDate) setMarketEndDate(m.endDate);
        loaded = true;
        break;
      }

      if (!loaded) throw new Error('No active BTC 5m market found.');
    } catch (err) {
      setMarketError(err.message);
    } finally {
      setMarketLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    autoLoadMarket();
  }, []);

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
