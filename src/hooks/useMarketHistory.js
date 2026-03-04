import { useEffect, useState } from 'react';
import { btc5mSlug } from '../lib/btc5mSlug';

const STORAGE_KEY = 'btcMarketHistory';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
}

function save(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}

async function fetchResult(windowMs) {
  const slug = btc5mSlug(windowMs);
  try {
    const res = await fetch(`/gamma-api/events?slug=${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    const events = Array.isArray(data) ? data : [data];
    const m = events[0]?.markets?.[0];
    if (!m) return null;
    const prices = Array.isArray(m.outcomePrices)
      ? m.outcomePrices
      : JSON.parse(m.outcomePrices ?? '[]');
    if (parseFloat(prices[0]) >= 0.99) return 'YES';
    if (parseFloat(prices[1]) >= 0.99) return 'NO';
  } catch {}
  return null;
}

export function useMarketHistory() {
  const [history, setHistory] = useState(load);

  useEffect(() => {
    async function refresh() {
      const now = Date.now();
      const stored = load();
      const storedSlugs = new Set(stored.map((r) => r.slug));
      const toAdd = [];

      // Walk back up to 8 windows to find newly resolved ones not yet stored
      for (let n = 1; n <= 8; n++) {
        const windowMs = now - n * 300_000;
        const slug = btc5mSlug(windowMs);
        if (storedSlugs.has(slug)) continue;
        const result = await fetchResult(windowMs);
        if (result) toAdd.push({ slug, result, windowMs });
      }

      if (toAdd.length === 0) return;

      const merged = [...toAdd, ...stored]
        .filter((r, i, arr) => arr.findIndex((x) => x.slug === r.slug) === i)
        .sort((a, b) => b.windowMs - a.windowMs)
        .slice(0, 5);
      save(merged);
      setHistory(merged);
    }

    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  return history; // [{slug, result: 'YES'|'NO', windowMs}], newest first
}
