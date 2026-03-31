'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickData,
  type Time,
} from 'lightweight-charts';
import { priceEngine } from '@/lib/priceEngine';

const STORAGE_KEY = 'btc-1m-bars';
const MAX_BARS = 500;
const SYMBOL = 'BTCUSD';

// ─── localStorage cache helpers ──────────────────────────────────────────────

function loadCachedBars(): CandlestickData<Time>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const bars = JSON.parse(raw) as CandlestickData<Time>[];
    const todayStartSec = Math.floor(
      new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime() / 1000,
    );
    return bars.filter((b) => (b.time as number) >= todayStartSec);
  } catch {
    return [];
  }
}

function saveCachedBars(bars: Map<Time, CandlestickData<Time>>): void {
  try {
    const arr = [...bars.values()].slice(-MAX_BARS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // storage full or unavailable
  }
}

// ─── Server helpers ───────────────────────────────────────────────────────────

async function fetchServerHistory(): Promise<CandlestickData<Time>[]> {
  try {
    const res = await fetch(`/api/chart/history?symbol=${SYMBOL}&limit=${MAX_BARS}`);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
    return data.map((c) => ({ ...c, time: c.time as Time }));
  } catch {
    return [];
  }
}

function persistCandle(bar: CandlestickData<Time>): void {
  // fire-and-forget — failures are silent so they never affect the chart
  fetch('/api/chart/candle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: SYMBOL,
      bucketStart: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }),
  }).catch(() => undefined);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TradingViewChartProps {
  targetPrice?: number;
}

export function TradingViewChart({ targetPrice = 64500 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const currentBarRef = useRef<CandlestickData<Time> | null>(null);
  const barsRef = useRef<Map<Time, CandlestickData<Time>>>(new Map());

  // Init chart once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: { background: { color: '#0d0e11' }, textColor: '#9a9b9f' },
      grid: { vertLines: { color: '#22242a' }, horzLines: { color: '#22242a' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: true },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#27c47c',
      downColor: '#e04f4f',
      borderUpColor: '#27c47c',
      borderDownColor: '#e04f4f',
      wickUpColor: '#27c47c',
      wickDownColor: '#e04f4f',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // 1. Paint localStorage cache immediately for instant first render
    const cached = loadCachedBars();
    if (cached.length > 0) {
      const map = new Map<Time, CandlestickData<Time>>();
      for (const bar of cached) map.set(bar.time, bar);
      barsRef.current = map;
      series.setData(cached);
      currentBarRef.current = cached[cached.length - 1];
    }

    // 2. Fetch canonical server history and reconcile
    fetchServerHistory().then((serverBars) => {
      if (!seriesRef.current || serverBars.length === 0) return;

      const map = new Map<Time, CandlestickData<Time>>();
      for (const bar of serverBars) map.set(bar.time, bar);

      // Keep the live in-memory bar if it belongs to the current minute
      const liveBar = currentBarRef.current;
      const nowMinuteSec = (Math.floor(Date.now() / 1000 / 60) * 60) as Time;
      if (liveBar && liveBar.time === nowMinuteSec) {
        map.set(liveBar.time, liveBar);
      }

      barsRef.current = map;
      const merged = [...map.values()].sort(
        (a, b) => (a.time as number) - (b.time as number),
      );
      seriesRef.current.setData(merged);
      saveCachedBars(map);
    });

    priceEngine.start();

    const unsub = priceEngine.subscribe((price) => {
      const barTime = (Math.floor(Date.now() / 1000 / 60) * 60) as Time;
      const cur = currentBarRef.current;

      const isNewBar = !cur || cur.time !== barTime;
      let nextBar: CandlestickData<Time>;

      if (isNewBar) {
        const open = cur ? cur.close : price;
        nextBar = { time: barTime, open, high: Math.max(open, price), low: Math.min(open, price), close: price };
        if (cur) {
          barsRef.current.set(cur.time, cur);
          // Persist the just-completed bar to Postgres
          persistCandle(cur);
        }
        saveCachedBars(barsRef.current);
      } else {
        nextBar = {
          time: barTime,
          open: cur.open,
          high: Math.max(cur.high, price),
          low: Math.min(cur.low, price),
          close: price,
        };
      }

      barsRef.current.set(barTime, nextBar);
      currentBarRef.current = nextBar;
      seriesRef.current?.update(nextBar);
    });

    const handleUnload = () => {
      const bar = currentBarRef.current;
      if (bar) {
        barsRef.current.set(bar.time, bar);
        saveCachedBars(barsRef.current);
        persistCandle(bar);
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      unsub();
      window.removeEventListener('beforeunload', handleUnload);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
      currentBarRef.current = null;
    };
  }, []);

  // Update price-to-beat line when targetPrice changes
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }

    if (typeof targetPrice === 'number' && !Number.isNaN(targetPrice)) {
      priceLineRef.current = series.createPriceLine({
        price: targetPrice,
        color: '#1F5E3A',
        lineWidth: 2,
        lineStyle: 0,
        title: 'Price to Beat',
        axisLabelVisible: true,
      });
    }
  }, [targetPrice]);

  return <div ref={containerRef} className="h-full w-full" />;
}
