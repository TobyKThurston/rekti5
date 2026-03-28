import { useEffect, useRef, useState } from 'react';
import { priceEngine } from '@/lib/priceEngine';

interface PriceTick {
  price: number;
  timestamp: number;
}

export interface MomentumResult {
  rawDelta: number | null;
  smoothedMomentum: number | null;
  label: string;
  direction: 'up' | 'down' | 'flat';
  strength: 'high' | 'building' | 'flat';
}

const HISTORY_MS  = 120_000; // keep 120s of price history
const LOOKBACK_MS =  60_000; // compare against price 60s ago
const SMOOTH_N    =       5; // average last 5 deltas

function classify(s: number): Pick<MomentumResult, 'label' | 'direction' | 'strength'> {
  if (s >  20) return { label: 'HIGH ↑',     direction: 'up',   strength: 'high'     };
  if (s >   5) return { label: 'BUILDING ↑', direction: 'up',   strength: 'building' };
  if (s >  -5) return { label: 'FLAT',        direction: 'flat', strength: 'flat'     };
  if (s > -20) return { label: 'BUILDING ↓', direction: 'down', strength: 'building' };
  return               { label: 'HIGH ↓',     direction: 'down', strength: 'high'     };
}

export function useMomentum(): MomentumResult {
  const historyRef = useRef<PriceTick[]>([]);
  const deltasRef  = useRef<number[]>([]);

  const [result, setResult] = useState<MomentumResult>({
    rawDelta: null,
    smoothedMomentum: null,
    label: 'FLAT',
    direction: 'flat',
    strength: 'flat',
  });

  useEffect(() => {
    priceEngine.start();

    return priceEngine.subscribe((price) => {
      const now = Date.now();

      // Append tick
      historyRef.current.push({ price, timestamp: now });

      // Trim entries older than HISTORY_MS (array is time-ordered, trim from front)
      const cutoff = now - HISTORY_MS;
      let trimTo = 0;
      while (trimTo < historyRef.current.length && historyRef.current[trimTo].timestamp < cutoff) {
        trimTo++;
      }
      if (trimTo > 0) historyRef.current.splice(0, trimTo);

      const history = historyRef.current;
      if (history.length < 2) return;

      // Find entry closest to now - LOOKBACK_MS
      // History is ascending; diff decreases then increases — break when it starts growing
      const targetTs = now - LOOKBACK_MS;
      let closest = history[0];
      let minDiff = Math.abs(history[0].timestamp - targetTs);
      for (let i = 1; i < history.length; i++) {
        const diff = Math.abs(history[i].timestamp - targetTs);
        if (diff < minDiff) { minDiff = diff; closest = history[i]; }
        else break;
      }

      const rawDelta = price - closest.price;

      // Smooth over last SMOOTH_N deltas
      deltasRef.current.push(rawDelta);
      if (deltasRef.current.length > SMOOTH_N) deltasRef.current.shift();
      const smoothedMomentum =
        deltasRef.current.reduce((a, b) => a + b, 0) / deltasRef.current.length;

      setResult({ rawDelta, smoothedMomentum, ...classify(smoothedMomentum) });
    });
  }, []);

  return result;
}
