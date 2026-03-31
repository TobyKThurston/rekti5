'use client';

import { useBtcPrice } from '@/hooks/useBtcPrice';
import { useMomentum } from '@/hooks/useMomentum';
import type { MarketHistoryEntry, WhaleTrade } from '@/types';

interface SignalStackProps {
  strikePrice: number | null;
  recentResults: MarketHistoryEntry[];
  whaleTrades: WhaleTrade[];
}

export function SignalStack({ strikePrice, recentResults, whaleTrades }: SignalStackProps) {
  const btcPrice = useBtcPrice();
  const delta = btcPrice != null && strikePrice != null ? btcPrice - strikePrice : null;
  const up = delta != null ? delta >= 0 : true;
  const last5 = recentResults.slice(0, 5);
  const yesCount = recentResults.filter(r => r.result === 'YES').length;
  const total = recentResults.length;
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : null;
  const hourBias = yesPct != null ? (yesPct >= 50 ? 'YES' : 'NO') : null;
  const hourColor = yesPct == null ? '#666c77' : yesPct >= 50 ? '#27c47c' : '#e04f4f';
  const momentum = useMomentum();

  const momentumColor =
    momentum.direction === 'up'   ? '#27c47c' :
    momentum.direction === 'down' ? '#e04f4f' : '#666c77';

  return (
    <div className="flex flex-col h-full w-full bg-[#131518] border-r border-[#22242a]">

      {/* PRIMARY EDGE */}
      <div className="flex flex-col items-center justify-center py-5 px-3 shrink-0 relative">
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: up ? '#27c47c' : '#e04f4f' }}
        />
        <div
          className="text-[2rem] font-bold leading-none tracking-tight"
          style={{ color: up ? '#27c47c' : '#e04f4f' }}
        >
          {delta != null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}` : '+5.00'}
        </div>
        <div
          className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: '#666c77' }}
        >
          {up ? 'ABOVE TARGET' : 'BELOW TARGET'}
        </div>
      </div>

      <div className="h-px bg-[#22242a] shrink-0" />

      {/* LAST 5 */}
      <div className="flex flex-col items-center py-3 px-3 shrink-0 gap-1">
        <div className="text-[9px] tracking-[0.08em] text-[#666c77] mb-1 self-center">LAST 5</div>
        {last5.length > 0 ? last5.map((r, i) => (
          <div key={r.slug} className="flex items-center justify-between w-full">
            <span className="text-[9px] text-[#666c77] font-mono w-4 shrink-0">{i + 1}</span>
            <span
              className="rounded-[2px] border px-1.5 py-[1px] text-[9px] font-bold"
              style={
                r.result === 'YES'
                  ? { borderColor: '#27c47c', backgroundColor: '#0a1a0f', color: '#27c47c' }
                  : { borderColor: '#e04f4f', backgroundColor: '#1a0a0a', color: '#e04f4f' }
              }
            >
              {r.result}
            </span>
          </div>
        )) : (
          <span className="text-[9px] text-[#666c77]">—</span>
        )}
      </div>

      <div className="h-px bg-[#22242a] shrink-0" />

      {/* MOMENTUM */}
      <div className="flex flex-col items-center justify-center py-3.5 px-3 shrink-0">
        <div className="text-[9px] tracking-[0.08em] text-[#666c77] mb-1">MOMENTUM</div>
        <div className="text-[13px] font-bold tabular-nums leading-none" style={{ color: momentumColor }}>
          {momentum.rawDelta != null
            ? `${momentum.rawDelta >= 0 ? '+' : ''}$${Math.abs(momentum.rawDelta).toFixed(2)}`
            : '—'}
        </div>
        <div className="text-[8.5px] text-[#666c77] mt-0.5">last 60s</div>
      </div>

      <div className="h-px bg-[#22242a] shrink-0" />

      {/* LAST HOUR */}
      <div className="flex flex-col items-center justify-center py-3.5 px-3 shrink-0">
        <div className="text-[9px] tracking-[0.08em] text-[#666c77] mb-1">LAST HOUR</div>
        <div className="text-[11px] font-bold" style={{ color: hourColor }}>
          {yesPct != null ? `${hourBias} ${yesPct}%` : '—'}
        </div>
        {total > 0 && (
          <div className="text-[8.5px] text-[#666c77] mt-0.5">{yesCount} / {total}</div>
        )}
      </div>

      <div className="h-px bg-[#22242a] shrink-0" />

      {/* WHALES */}
      {(() => {
        const yesVol = whaleTrades.filter(w => w.side === 'YES').reduce((s, w) => s + w.size, 0);
        const noVol  = whaleTrades.filter(w => w.side === 'NO').reduce((s, w) => s + w.size, 0);
        const totalVol = yesVol + noVol;
        const whaleBias = totalVol === 0 ? null : yesVol >= noVol ? 'YES' : 'NO';
        const whalePct  = totalVol === 0 ? null : Math.round(Math.max(yesVol, noVol) / totalVol * 100);
        const whaleAddrs = [...new Map(whaleTrades.filter(w => w.address).map(w => [w.address, w])).values()]
          .slice(0, 4).map(w => w.address!);
        const biasColor = whaleBias == null ? '#666c77' : whaleBias === 'YES' ? '#27c47c' : '#e04f4f';
        return (
          <div className="flex flex-col items-center py-3.5 px-3 shrink-0 gap-2">
            <div className="text-[9px] tracking-[0.08em] text-[#666c77]">WHALES</div>
            <div className="text-[11px] font-bold" style={{ color: biasColor }}>
              {whaleBias != null ? `${whaleBias} ${whalePct}%` : '—'}
            </div>
            {whaleTrades.length > 0 && (
              <div className="flex flex-col gap-[3px] w-full mt-0.5">
                {whaleTrades.slice(0, 8).map((w) => (
                  <div key={w.id} className="flex items-center justify-between w-full">
                    <span
                      className="text-[8.5px] font-bold w-[22px] shrink-0"
                      style={{ color: w.side === 'YES' ? '#27c47c' : '#e04f4f' }}
                    >
                      {w.side}
                    </span>
                    <span className="text-[8.5px] font-mono text-[#a0a5b0]">
                      ${w.size >= 1000 ? `${(w.size / 1000).toFixed(1)}k` : Math.round(w.size)}
                    </span>
                    <span className="text-[8.5px] font-mono text-[#666c77]">
                      {Math.round(w.price * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {whaleAddrs.length > 0 && (
              <div className="flex flex-col gap-1 w-full mt-0.5">
                {whaleAddrs.map((addr) => (
                  <div key={addr} className="text-[8.5px] font-mono text-[#666c77] tracking-wide text-center opacity-60">
                    {addr}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* spacer */}
      <div className="flex-1" />

    </div>
  );
}
