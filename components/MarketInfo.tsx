'use client';

import type { Market, MarketHistoryEntry } from '@/types';

interface MarketInfoProps {
  market: Market | null;
  marketLoading: boolean;
  marketError: string | null;
  countdownDisplay: string;
  countdownColor: string;
  marketStrikePrice: number | null;
  btcPrice: number | null;
  autoLoadMarket: () => void;
  recentResults: MarketHistoryEntry[];
}

export function MarketInfo({
  market,
  marketLoading,
  marketError,
  countdownDisplay,
  countdownColor,
  marketStrikePrice,
  btcPrice,
  autoLoadMarket,
  recentResults,
}: MarketInfoProps) {
  const yesPct = market ? Math.round(parseFloat(market.yesPrice) * 100) : 62;
  const noPct  = 100 - yesPct;
  const lastUpdateTime = market?.lastUpdated
    ? new Date(market.lastUpdated).toLocaleTimeString('en-US', { hour12: false })
    : null;

  return (
    <section className="border-b border-[#22242a] px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.08em] text-[#666c77]">BTC 5M UP/DOWN</span>
        <button
          onClick={autoLoadMarket}
          disabled={marketLoading}
          className="rounded-[2px] border border-[#22242a] px-2 py-[2px] text-[10px] text-[#666c77] hover:border-[#f09000] hover:text-[#f09000] disabled:opacity-50"
        >
          {marketLoading ? '…' : '↻'}
        </button>
      </div>

      {marketError && (
        <div className="mb-2 text-[11px] text-[#e04f4f]">{marketError}</div>
      )}

      {!market ? (
        <div className="text-[11px] text-[#666c77]">Loading market…</div>
      ) : (
        <>
          <div className="mb-2 text-[11px] text-[#e8e8e8] leading-snug">{market.question}</div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-[2px] bg-[#1a1c20] border border-[#22242a] px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[9px] tracking-[0.08em] text-[#f09000] font-semibold mb-0.5">
                  RESOLUTION PRICE
                </div>
                <div className="text-[22px] font-bold text-[#f5f5f5] leading-none">
                  {btcPrice != null
                    ? `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </div>
                {marketStrikePrice != null && btcPrice != null && (
                  <div
                    className="mt-0.5 text-[11px] font-semibold"
                    style={{ color: btcPrice >= marketStrikePrice ? '#27c47c' : '#e04f4f' }}
                  >
                    {btcPrice >= marketStrikePrice ? '+' : ''}
                    {(btcPrice - marketStrikePrice).toFixed(0)} vs target ${marketStrikePrice.toLocaleString()}
                  </div>
                )}
              </div>
              <span
                className="inline-block h-2 w-2 rounded-full bg-[#f09000] shrink-0"
                style={{ boxShadow: '0 0 6px #f09000' }}
              />
            </div>

            <div className="rounded-[2px] bg-[#1a1c20] border border-[#22242a] px-3 py-2">
              <div className="text-[9px] tracking-[0.08em] text-[#27c47c] font-semibold mb-0.5">
                PRICE TO BEAT · 5M
              </div>
              <div className="text-[22px] font-bold text-[#f5f5f5] leading-none">
                {marketStrikePrice != null
                  ? `$${marketStrikePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-[44px] font-bold leading-none" style={{ color: countdownColor }}>
              {countdownDisplay}
            </div>
          </div>

          <div className="mt-2">
            <div className="flex h-[6px] overflow-hidden rounded-[1px]">
              <div className="bg-[#27c47c]" style={{ width: `${yesPct}%` }} />
              <div className="bg-[#e04f4f]" style={{ width: `${noPct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px]">
              <span className="text-[#27c47c]">{yesPct}% YES</span>
              <span className="text-[#e04f4f]">{noPct}% NO</span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="rounded-[2px] bg-[#1a1c20] px-2 py-1.5 text-center">
              <div className="text-[10px] text-[#666c77]">YES</div>
              <div className="text-[13px] font-bold text-[#27c47c]">{parseFloat(market.yesPrice).toFixed(3)}</div>
            </div>
            <div className="rounded-[2px] bg-[#1a1c20] px-2 py-1.5 text-center">
              <div className="text-[10px] text-[#666c77]">NO</div>
              <div className="text-[13px] font-bold text-[#e04f4f]">{parseFloat(market.noPrice).toFixed(3)}</div>
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-3 gap-1">
            <div className="rounded-[2px] bg-[#1a1c20] px-1.5 py-1">
              <div className="text-[9px] text-[#666c77]">BID</div>
              <div className="text-[11px] text-[#27c47c]">{parseFloat(String(market.bestBid)).toFixed(3)}</div>
            </div>
            <div className="rounded-[2px] bg-[#1a1c20] px-1.5 py-1">
              <div className="text-[9px] text-[#666c77]">ASK</div>
              <div className="text-[11px] text-[#e04f4f]">{parseFloat(String(market.bestAsk)).toFixed(3)}</div>
            </div>
            <div className="rounded-[2px] bg-[#1a1c20] px-1.5 py-1">
              <div className="text-[9px] text-[#666c77]">SPRD</div>
              <div className="text-[11px] text-[#e8e8e8]">{market.spread}</div>
            </div>
          </div>

          {recentResults?.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="text-[10px] text-[#666c77] mr-0.5">LAST 5</span>
              {[...recentResults].reverse().map((r) => (
                <span
                  key={r.slug}
                  className={`rounded-[2px] border px-1.5 py-0.5 text-[10px] font-bold ${
                    r.result === 'YES'
                      ? 'border-[#27c47c] bg-[#0a1a0f] text-[#27c47c]'
                      : 'border-[#e04f4f] bg-[#1a0a0a] text-[#e04f4f]'
                  }`}
                >
                  {r.result}
                </span>
              ))}
            </div>
          )}

          {lastUpdateTime && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#666c77]">
              <span>{lastUpdateTime}</span>
              <span>
                <span className="text-[#27c47c]">Y {parseFloat(market.yesPrice).toFixed(3)}</span>
                {' · '}
                <span className="text-[#e04f4f]">N {parseFloat(market.noPrice).toFixed(3)}</span>
                {' · '}
                <span className="text-[#e8e8e8]">Δ {parseFloat(market.spread).toFixed(3)}</span>
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
