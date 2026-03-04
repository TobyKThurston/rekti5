import { useEffect, useRef, useState } from 'react';
import { TV_SCRIPT_SRC } from '../config/networks';

export function TradingViewChart({ targetPrice = 64500 }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const priceLineRef = useRef(null);
  const drawPriceLineRef = useRef(null);
  const targetPriceRef = useRef(targetPrice);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    targetPriceRef.current = targetPrice;
  }, [targetPrice]);

  useEffect(() => {
    let cancelled = false;

    function initWidget() {
      if (cancelled || !containerRef.current || !window.TradingView?.widget) return;

      // Fresh ID every time — prevents TradingView internal state conflicts when
      // the same container is reused (e.g. React StrictMode double-invocation).
      const containerId = `tv-chart-${Math.random().toString(36).slice(2)}`;
      containerRef.current.id = containerId;

      const widget = new window.TradingView.widget({
        symbol: 'BINANCE:BTCUSDT',
        interval: '1',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        allow_symbol_change: true,
        autosize: true,
        container_id: containerId,
      });

      widgetRef.current = widget;

      widget.onChartReady(() => {
        if (cancelled) return;

        const chart = widget.chart();

        const drawPriceLine = (nextTargetPrice) => {
          if (!chart || typeof nextTargetPrice !== 'number' || Number.isNaN(nextTargetPrice)) return;

          if (priceLineRef.current) {
            try {
              chart.removeEntity(priceLineRef.current);
            } catch {
              // Ignore stale entity IDs after symbol/interval resets.
            }
            priceLineRef.current = null;
          }

          const created = chart.createShape(
            { price: nextTargetPrice },
            {
              shape: 'horizontal_line',
              lock: true,
              disableSelection: true,
              disableSave: true,
              text: 'Price to Beat',
              overrides: {
                linecolor: '#1F5E3A',
                linestyle: 0,
                linewidth: 2,
              },
            }
          );

          Promise.resolve(created).then((entityId) => {
            priceLineRef.current = entityId;
          });
        };

        drawPriceLineRef.current = drawPriceLine;
        drawPriceLine(targetPriceRef.current);
        window.updatePriceToBeat = drawPriceLine;

        chart.onIntervalChanged().subscribe(null, () => drawPriceLine(targetPriceRef.current));
        chart.onSymbolChanged().subscribe(null, () => drawPriceLine(targetPriceRef.current));
      });
    }

    if (window.TradingView?.widget) {
      initWidget();
    } else {
      const script = document.createElement('script');
      script.src = TV_SCRIPT_SRC;
      script.async = true;
      script.onload = initWidget;
      script.onerror = () => { if (!cancelled) setLoadError(true); };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (window.updatePriceToBeat === drawPriceLineRef.current) {
        delete window.updatePriceToBeat;
      }
      if (widgetRef.current) {
        widgetRef.current.remove();
        widgetRef.current = null;
      }
      priceLineRef.current = null;
      drawPriceLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (drawPriceLineRef.current) {
      drawPriceLineRef.current(targetPrice);
    }
  }, [targetPrice]);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="h-full w-full" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-[#0d0e11]">
          Chart unavailable — TradingView servers could not be reached.
        </div>
      )}
    </div>
  );
}
