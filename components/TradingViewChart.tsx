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

function loadBars(): CandlestickData<Time>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const bars = JSON.parse(raw) as CandlestickData<Time>[];
    // Discard bars from previous UTC days to prevent stale data on reload
    const todayStartSec = Math.floor(
      new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime() / 1000
    );
    return bars.filter(b => (b.time as number) >= todayStartSec);
  } catch {
    return [];
  }
}

function saveBars(bars: Map<Time, CandlestickData<Time>>): void {
  try {
    const arr = [...bars.values()].slice(-MAX_BARS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // storage full or unavailable
  }
}

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

    // Restore persisted bars
    const saved = loadBars();
    if (saved.length > 0) {
      const map = new Map<Time, CandlestickData<Time>>();
      for (const bar of saved) map.set(bar.time, bar);
      barsRef.current = map;
      series.setData(saved);
      // Restore the last bar as the current live bar
      currentBarRef.current = saved[saved.length - 1];
    }

    priceEngine.start();

    const unsub = priceEngine.subscribe((price) => {
      const barTime = (Math.floor(Date.now() / 1000 / 60) * 60) as Time;
      const cur = currentBarRef.current;

      const isNewBar = !cur || cur.time !== barTime;
      let nextBar: CandlestickData<Time>;

      if (isNewBar) {
        nextBar = { time: barTime, open: price, high: price, low: price, close: price };
        // Persist when a new bar opens (saves the completed previous bar too)
        if (cur) barsRef.current.set(cur.time, cur);
        saveBars(barsRef.current);
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
      series.update(nextBar);
    });

    // Save current partial bar on page unload
    const handleUnload = () => {
      if (currentBarRef.current) {
        barsRef.current.set(currentBarRef.current.time, currentBarRef.current);
        saveBars(barsRef.current);
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
