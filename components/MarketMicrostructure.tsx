'use client';

import type { Market, RecentTrade } from '@/types';

interface MarketMicrostructureProps {
  market: Market | null;
  recentTrades: RecentTrade[];
  amountValue: string;
}

export function MarketMicrostructure({ market, recentTrades, amountValue }: MarketMicrostructureProps) {
  const amount   = parseFloat(amountValue) || 0;
  const yesBid   = market ? parseFloat(String(market.bestBid))  : 0;
  const yesAsk   = market ? parseFloat(String(market.bestAsk))  : 0;
  const spread   = market ? parseFloat(market.spread)           : 0;
  const fillPrice = yesAsk > 0 ? yesAsk : 0;

  return (
    <div className="flex h-full w-full divide-x divide-[#22242a]">

      {/* ── Recent Trades ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-3 py-2">
        <div className="text-[9px] tracking-[0.08em] text-[#666c77] mb-1.5">FLOW</div>
        {recentTrades.length === 0 ? (
          <span className="text-[11px] text-[#3a3d45]">—</span>
        ) : (
          <div className="flex flex-col gap-[3px]">
            {recentTrades.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center gap-2.5"
                style={{ opacity: i === 0 ? 1 : Math.max(0.25, 1 - i * 0.15) }}
              >
                <span
                  className="text-[11px] font-bold w-6"
                  style={{ color: t.side === 'YES' ? '#27c47c' : '#e04f4f' }}
                >
                  {t.side}
                </span>
                <span className="text-[11px] text-[#9a9b9f]">{t.price.toFixed(3)}</span>
                {t.size > 0 && (
                  <span className="text-[10px] text-[#555]">${t.size % 1 === 0 ? t.size.toFixed(0) : t.size.toFixed(1)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Liquidity Snapshot ────────────────────────────── */}
      <div className="w-[160px] shrink-0 px-3 py-2">
        <div className="text-[9px] tracking-[0.08em] text-[#666c77] mb-1.5">BOOK · YES</div>
        {market ? (
          <div className="flex flex-col gap-[3px]">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#27c47c]">BID</span>
              <span className="text-[#9a9b9f]">{yesBid.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#e04f4f]">ASK</span>
              <span className="text-[#9a9b9f]">{yesAsk.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#444]">SPRD</span>
              <span className="text-[#666c77]">{spread.toFixed(3)}</span>
            </div>
            {amount > 0 && fillPrice > 0 && (
              <div className="flex justify-between text-[11px] mt-1 pt-1 border-t border-[#22242a]">
                <span className="text-[#444]">FILL ${amount.toFixed(0)}</span>
                <span className="text-[#f09000]">{fillPrice.toFixed(3)}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#3a3d45]">—</span>
        )}
      </div>

    </div>
  );
}
