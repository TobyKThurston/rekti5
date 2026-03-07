import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { btc5mSlug } from '../lib/btc5mSlug';

// Module-level cache — survives re-renders, reset on 404 (stale deploy)
let cachedBuildId = null;

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
async function getWindowOpenPrice(windowStartMs) {
  const windowStartSec = windowStartMs / 1000;
  const [roundId, answer, , updatedAt] = await clContract.latestRoundData();

  if (updatedAt.toNumber() <= windowStartSec) {
    return answer.toNumber() / 1e8; // this round was already active at window open
  }

  // Oracle updated after window open — walk back to the round active at windowStartSec
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

  return answer.toNumber() / 1e8; // best available if walkback exhausted
}

// Walk a parsed Next.js data object looking for priceToBeat for the given slug.
// Polymarket stores it in the React Query dehydrated cache (queries[n].state.data.events[]).
// The CURRENT active window never has priceToBeat set; only resolved past events do.
function findPriceToBeat(data, slug) {
  // 1. Direct path (rare — some fully-resolved responses surface it at top level)
  const pageProps = data.props?.pageProps ?? data.pageProps ?? {};
  const direct = pageProps.eventMetadata?.priceToBeat;
  if (direct != null) return parseFloat(direct);

  // 2. Walk the dehydrated React Query cache
  const queries = pageProps.dehydratedState?.queries ?? [];
  for (const q of queries) {
    const qd = q?.state?.data;
    if (!qd) continue;

    // 2a. Individual event query — qd IS the event object
    if (qd.slug === slug && qd.eventMetadata?.priceToBeat != null) {
      return parseFloat(qd.eventMetadata.priceToBeat);
    }

    // 2b. Series query — qd has an `events` array
    if (Array.isArray(qd.events)) {
      const match = qd.events.find(
        (e) => e.slug === slug && e.eventMetadata?.priceToBeat != null,
      );
      if (match) return parseFloat(match.eventMetadata.priceToBeat);
    }
  }

  return null; // not found (current active window never has it)
}

// Fetch priceToBeat for the given slug from Polymarket's _next/data endpoint.
// Sources tried in order:
//   1. _next/data JSON  — lightweight if buildId is cached
//   2. Event page HTML  — slow path that also refreshes buildId
// Returns null (not throws) when the event exists but has no priceToBeat yet.
async function fetchPriceToBeat(slug) {
  // Fast path: buildId already known
  if (cachedBuildId) {
    try {
      const res = await fetch(
        `/polymarket/_next/data/${cachedBuildId}/en/event/${slug}.json?slug=${slug}`,
        { headers: { 'x-nextjs-data': '1' } },
      );
      if (res.ok) {
        const data = await res.json();
        return findPriceToBeat(data, slug); // may be null for active window
      }
      if (res.status === 404) cachedBuildId = null; // stale build — fall through
    } catch { /* network hiccup — fall through */ }
  }

  // Slow path: fetch the event page HTML to discover buildId
  const res = await fetch(`/polymarket/event/${slug}`);
  if (!res.ok) throw new Error(`Polymarket event page HTTP ${res.status}`);
  const html = await res.text();

  // Script tag may have extra attributes (e.g. crossorigin="anonymous")
  const m = html.match(/__NEXT_DATA__[^>]*>([\s\S]+?)<\/script>/);
  if (!m) throw new Error('__NEXT_DATA__ not found in Polymarket page');

  const nextData = JSON.parse(m[1]);
  cachedBuildId = nextData.buildId;

  return findPriceToBeat(nextData, slug); // may be null
}

// Returns the priceToBeat (BTC opening price) for the current 5-minute window.
//
// Strategy:
//   - Each new 5-minute window, query Polymarket for the current slug's priceToBeat.
//   - Polymarket only sets eventMetadata.priceToBeat AFTER a window resolves, so for
//     the LIVE window we always get null back.
//   - When that happens, use a Chainlink historical lookup to find the round that was
//     active at the exact window-open timestamp — this is the true priceToBeat.
//   - Once a price is recorded for a window we stop retrying until the next window.
export function useStrikePrice() {
  const [strikePrice, setStrikePrice] = useState(null);
  const lastWindowRef = useRef(null);
  const fetchingRef   = useRef(false);

  useEffect(() => {
    if (import.meta.env.PROD) return; // no backend on Vercel — polling loop handles it
    const windowStartMs = Math.floor(Date.now() / 300_000) * 300_000;
    fetch('/price-to-beat')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.price != null && data.window_start === windowStartMs) {
          setStrikePrice(data.price);
          lastWindowRef.current = windowStartMs; // skip Chainlink lookup for this window
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = async () => {
      const windowStartMs = Math.floor(Date.now() / 300_000) * 300_000;
      if (lastWindowRef.current === windowStartMs) return; // same window, skip
      if (fetchingRef.current) return;                     // fetch already in flight

      fetchingRef.current = true;
      const slug = btc5mSlug(Date.now());
      try {
        const price = await fetchPriceToBeat(slug);

        if (price != null && !isNaN(price)) {
          // Polymarket has the exact priceToBeat (resolved event) — use it
          lastWindowRef.current = windowStartMs;
          setStrikePrice(price);
        } else {
          // Active window — Polymarket hasn't set priceToBeat yet.
          // Use Chainlink historical lookup for the window-open price.
          const clPrice = await getWindowOpenPrice(windowStartMs);
          if (clPrice != null && isFinite(clPrice)) {
            lastWindowRef.current = windowStartMs;
            setStrikePrice(clPrice);
          }
        }
        // else: neither source ready yet — leave lastWindowRef unset so we retry
      } catch (err) {
        console.error('[useStrikePrice]', err);
        // Don't set lastWindowRef — allow retry next second
      } finally {
        fetchingRef.current = false;
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []); // stable interval — no external deps

  return strikePrice;
}
