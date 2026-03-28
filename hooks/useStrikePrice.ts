import { useEffect, useRef, useState } from 'react';
import { chainlinkRtds, type ChainlinkTick } from '@/lib/chainlinkRtds';

// ── Locked-strike shape ────────────────────────────────────────────────────────

interface LockedStrike {
  windowStartMs:   number;
  strikeValue:     number;
  strikeTimestamp: number;  // Chainlink tick timestamp (ms)
  source:          'polymarket_chainlink_rtds';
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const CACHE_KEY = 'strike-price-v3';

function readCache(windowStartMs: number): LockedStrike | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LockedStrike;
    if (parsed.windowStartMs === windowStartMs && typeof parsed.strikeValue === 'number') {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function writeCache(lock: LockedStrike): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(lock)); } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the "Price to Beat" for the active 5-minute window.
 *
 * Source:  Polymarket Chainlink RTDS  (wss://ws-live-data.polymarket.com)
 * Rule:    strike = first tick where tick.timestamp >= windowStartMs
 * Freeze:  once selected within a window, the value NEVER changes again
 *          for that window, regardless of subsequent RTDS ticks.
 */
export function useStrikePrice(): number | null {
  const [strikePrice, setStrikePrice] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const windowStartMs = Math.floor(Date.now() / 300_000) * 300_000;
    return readCache(windowStartMs)?.strikeValue ?? null;
  });

  // lockedRef is the single source of truth for whether a strike has been
  // chosen for the current window.  It is set exactly ONCE per window and
  // is never cleared within that window.
  const lockedRef = useRef<LockedStrike | null>(null);

  useEffect(() => {
    // ── 1. Restore cache into ref before any compute() runs ─────────────────
    const initWindowMs = Math.floor(Date.now() / 300_000) * 300_000;
    const cached       = readCache(initWindowMs);
    if (cached) {
      lockedRef.current = cached;
      console.debug(
        '[useStrikePrice] restored from localStorage',
        'window:', new Date(initWindowMs).toISOString(),
        'strikeValue:', cached.strikeValue,
        'tickTs:', new Date(cached.strikeTimestamp).toISOString(),
      );
    }

    chainlinkRtds.start();

    // ── 2. Core compute — called on every tick and every 1-second poll ───────
    const compute = (incomingTick?: ChainlinkTick) => {
      const windowStartMs = Math.floor(Date.now() / 300_000) * 300_000;
      const locked        = lockedRef.current;

      console.debug(
        '[useStrikePrice] compute | currentWindow:', new Date(windowStartMs).toISOString(),
        '| lockedWindow:', locked ? new Date(locked.windowStartMs).toISOString() : 'none',
      );

      // ── GUARD: strike already frozen for this window ─────────────────────
      if (locked && locked.windowStartMs === windowStartMs) {
        if (incomingTick) {
          console.debug(
            '[useStrikePrice] ignoring tick — strike already locked for this window',
            'incomingTick:', incomingTick.price, new Date(incomingTick.timestamp).toISOString(),
            'lockedStrike:', locked.strikeValue,
          );
        }
        return; // do nothing — state is already correct
      }

      // ── New window or no lock yet ─────────────────────────────────────────

      // Check localStorage (survives page refresh)
      const fromCache = readCache(windowStartMs);
      if (fromCache) {
        lockedRef.current = fromCache;
        setStrikePrice(fromCache.strikeValue);
        console.debug(
          '[useStrikePrice] strike reused from cache',
          'window:', new Date(windowStartMs).toISOString(),
          'strikeValue:', fromCache.strikeValue,
          'source:', fromCache.source,
        );
        return;
      }

      // No cache — find the first RTDS tick at or after the window boundary
      const tick = chainlinkRtds.getFirstTickAtOrAfter(windowStartMs);
      if (!tick) {
        console.debug(
          '[useStrikePrice] waiting for first RTDS tick',
          'window:', new Date(windowStartMs).toISOString(),
        );
        return;
      }

      // ── LOCK the strike for this window — only happens once per window ────
      const newLock: LockedStrike = {
        windowStartMs,
        strikeValue:     tick.price,
        strikeTimestamp: tick.timestamp,
        source:          'polymarket_chainlink_rtds',
      };
      lockedRef.current = newLock;
      setStrikePrice(tick.price);
      writeCache(newLock);

      console.debug(
        '[useStrikePrice] NEW strike selected and locked',
        'window:', new Date(windowStartMs).toISOString(),
        'tickTs:', new Date(tick.timestamp).toISOString(),
        'strikeValue:', tick.price,
        'source: polymarket_chainlink_rtds',
      );
    };

    // Subscribe to RTDS ticks (passes the incoming tick so we can log it when ignored)
    const unsub    = chainlinkRtds.subscribe((tick) => compute(tick));
    // Poll every second to catch window rollovers when no tick is in flight
    const interval = setInterval(() => compute(), 1_000);
    // Run immediately with whatever is already in the buffer
    compute();

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return strikePrice;
}
