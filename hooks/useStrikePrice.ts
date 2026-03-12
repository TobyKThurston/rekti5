import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { btc5mSlug } from '@/lib/btc5mSlug';

// Module-level cache — survives re-renders, reset on 404 (stale deploy)
let cachedBuildId: string | null = null;

// Chainlink BTC/USD on Polygon — same contract as useBtcPrice
const CHAINLINK_BTC_USD = '0xc907E116054Ad103354f2D350FD2514433D57F6f';
const ABI = [
  'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
  'function getRoundData(uint80) view returns (uint80,int256,uint256,uint256,uint80)',
];
const provider = new ethers.providers.JsonRpcProvider('/polygon-rpc');
const clContract = new ethers.Contract(CHAINLINK_BTC_USD, ABI, provider);

// Returns the BTC/USD price (in dollars) that was active on-chain at windowStartMs.
// Walks back round IDs until it finds the round whose updatedAt <= windowStartSec.
async function getWindowOpenPrice(windowStartMs: number): Promise<number | null> {
  const windowStartSec = windowStartMs / 1000;
  const [roundId, answer, , updatedAt] = await clContract.latestRoundData();

  if (updatedAt.toNumber() <= windowStartSec) {
    return answer.toNumber() / 1e8;
  }

  const phaseId    = roundId.shr(64);
  let   aggRoundId = roundId.and('0xFFFFFFFFFFFFFFFF');

  for (let i = 0; i < 20; i++) {
    aggRoundId = aggRoundId.sub(1);
    if (aggRoundId.lte(0)) break;
    const prevId = phaseId.shl(64).or(aggRoundId);
    try {
      const [, prevAnswer, , prevUpdatedAt] = await clContract.getRoundData(prevId);
      if (prevUpdatedAt.toNumber() <= windowStartSec) {
        return prevAnswer.toNumber() / 1e8;
      }
    } catch { break; }
  }

  return answer.toNumber() / 1e8;
}

function findPriceToBeat(data: Record<string, unknown>, slug: string): number | null {
  const pageProps = (data.props as Record<string, unknown>)?.pageProps as Record<string, unknown>
    ?? (data.pageProps as Record<string, unknown>)
    ?? {};
  const direct = (pageProps.eventMetadata as Record<string, unknown>)?.priceToBeat;
  if (direct != null) return parseFloat(String(direct));

  const queries = ((pageProps.dehydratedState as Record<string, unknown>)?.queries as unknown[]) ?? [];
  for (const q of queries) {
    const qd = (q as Record<string, unknown>)?.state as Record<string, unknown>;
    const qdata = qd?.data as Record<string, unknown> | undefined;
    if (!qdata) continue;

    if (qdata.slug === slug && (qdata.eventMetadata as Record<string, unknown>)?.priceToBeat != null) {
      return parseFloat(String((qdata.eventMetadata as Record<string, unknown>).priceToBeat));
    }

    if (Array.isArray(qdata.events)) {
      const match = (qdata.events as Record<string, unknown>[]).find(
        (e) => e.slug === slug && (e.eventMetadata as Record<string, unknown>)?.priceToBeat != null,
      );
      if (match) return parseFloat(String((match.eventMetadata as Record<string, unknown>).priceToBeat));
    }
  }

  return null;
}

async function fetchPriceToBeat(slug: string): Promise<number | null> {
  if (cachedBuildId) {
    try {
      const res = await fetch(
        `/polymarket/_next/data/${cachedBuildId}/en/event/${slug}.json?slug=${slug}`,
        { headers: { 'x-nextjs-data': '1' } },
      );
      if (res.ok) {
        const data = await res.json();
        return findPriceToBeat(data, slug);
      }
      if (res.status === 404) cachedBuildId = null;
    } catch {}
  }

  const res = await fetch(`/polymarket/event/${slug}`);
  if (!res.ok) throw new Error(`Polymarket event page HTTP ${res.status}`);
  const html = await res.text();

  const m = html.match(/__NEXT_DATA__[^>]*>([\s\S]+?)<\/script>/);
  if (!m) throw new Error('__NEXT_DATA__ not found in Polymarket page');

  const nextData = JSON.parse(m[1]);
  cachedBuildId = nextData.buildId;

  return findPriceToBeat(nextData, slug);
}

export function useStrikePrice(): number | null {
  const [strikePrice, setStrikePrice] = useState<number | null>(null);
  const lastWindowRef = useRef<number | null>(null);
  const fetchingRef   = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const windowStartMs = Math.floor(Date.now() / 300_000) * 300_000;
    fetch('/api/price-to-beat')
      .then(r => r.ok ? r.json() : null)
      .then((data: { price?: number; window_start?: number } | null) => {
        if (data?.price != null && data.window_start === windowStartMs) {
          setStrikePrice(data.price);
          lastWindowRef.current = windowStartMs;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = async () => {
      const windowStartMs = Math.floor(Date.now() / 300_000) * 300_000;
      if (lastWindowRef.current === windowStartMs) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;
      const slug = btc5mSlug(Date.now());
      try {
        const price = await fetchPriceToBeat(slug);

        if (price != null && !isNaN(price)) {
          lastWindowRef.current = windowStartMs;
          setStrikePrice(price);
        } else {
          const clPrice = await getWindowOpenPrice(windowStartMs);
          if (clPrice != null && isFinite(clPrice)) {
            lastWindowRef.current = windowStartMs;
            setStrikePrice(clPrice);
          }
        }
      } catch (err) {
        console.error('[useStrikePrice]', err);
      } finally {
        fetchingRef.current = false;
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  return strikePrice;
}
