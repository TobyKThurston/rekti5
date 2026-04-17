'use client';

interface OrderEntryProps {
  sizePct: number;
  setSizePct: (v: number) => void;
  walletBalance: number;
  amountValue: string;
  feeEstimate: string;
  upPayout: string;
  downPayout: string;
  buyYes: () => void;
  buyNo: () => void;
  buyYesLoading: boolean;
  buyNoLoading: boolean;
  buyDisabled: boolean;
  geoBlocked: boolean;
  stopLoss: string;
  setStopLoss: (v: string) => void;
  takeProfit: string;
  setTakeProfit: (v: string) => void;
  pendingSide: 'yes' | 'no' | null;
}

export function OrderEntry({
  sizePct,
  setSizePct,
  walletBalance,
  amountValue,
  feeEstimate,
  upPayout,
  downPayout,
  buyYes,
  buyNo,
  buyYesLoading,
  buyNoLoading,
  buyDisabled,
  geoBlocked,
  stopLoss,
  setStopLoss,
  takeProfit,
  setTakeProfit,
  pendingSide,
}: OrderEntryProps) {
  const SIZE_PRESETS = [
    { dollars: 1,  key: '1' },
    { dollars: 5,  key: '2' },
    { dollars: 10, key: '3' },
    { dollars: 25, key: '4' },
    { dollars: 50, key: '5' },
  ];

  const yesArmed = pendingSide === 'yes';
  const noArmed  = pendingSide === 'no';

  return (
    <section className="border-b border-[#22242a] px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#666c77] uppercase">Order</div>
      <div className="mb-1 text-[10px] text-[#666c77] tracking-[0.08em] uppercase">Amount ($)</div>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={amountValue}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isFinite(v) || walletBalance <= 0) { setSizePct(0); return; }
          const clamped = Math.max(0, Math.min(walletBalance, v));
          setSizePct((clamped / walletBalance) * 100);
        }}
        className="mb-1.5 w-full rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-2 py-1.5 text-[13px] font-bold text-[#e8e8e8] tabular-nums outline-none focus:border-[#f09000]"
      />
      <input
        type="range"
        min="0"
        max="100"
        value={sizePct}
        onChange={(e) => setSizePct(Number(e.target.value))}
        className="mb-1.5 w-full accent-[#f09000]"
      />
      <div className="mb-2 grid grid-cols-5 gap-1">
        {SIZE_PRESETS.map(({ dollars, key }) => {
          const targetPct = walletBalance > 0 ? Math.min(100, (dollars / walletBalance) * 100) : 0;
          const active = walletBalance > 0 && Math.abs(sizePct - targetPct) < 0.01;
          return (
            <button
              key={dollars}
              onClick={() => setSizePct(targetPct)}
              className={`flex items-center justify-center gap-1 rounded-[2px] border px-1 py-1 text-[11px] ${
                active
                  ? 'border-[#f09000] bg-[#1a1400] text-[#f09000]'
                  : 'border-[#22242a] bg-[#1a1c20] text-[#888e99] hover:border-[#f09000] hover:text-[#f09000]'
              }`}
            >
              <span>${dollars}</span>
              <kbd className="rounded-[2px] border border-white/10 bg-black/30 px-1 py-[0.5px] text-[9px] font-mono text-[#888e99]">{key}</kbd>
            </button>
          );
        })}
      </div>
      <div className="mb-2 grid grid-cols-3 divide-x divide-[#22242a] rounded-[2px] border border-[#22242a] bg-[#1a1c20] text-[10px]">
        <div className="px-1.5 py-1">
          <div className="text-[#666c77]">Size</div>
          <div className="text-[#e8e8e8]">${(parseFloat(amountValue) - parseFloat(feeEstimate)).toFixed(2)}</div>
        </div>
        <div className="px-1.5 py-1">
          <div className="text-[#666c77]">Fee</div>
          <div className="text-[#666c77]">${feeEstimate}</div>
        </div>
        <div className="px-1.5 py-1">
          <div className="text-[#666c77]">Total</div>
          <div className="text-[#e8e8e8]">${amountValue}</div>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-2 divide-x divide-[#22242a] rounded-[2px] border border-[#22242a] bg-[#1a1c20] text-[10px]">
        <div className="px-1.5 py-1">
          <div className="text-[#666c77]">if YES wins</div>
          <div className="text-[#27c47c]">${upPayout}</div>
        </div>
        <div className="px-1.5 py-1">
          <div className="text-[#666c77]">if NO wins</div>
          <div className="text-[#e04f4f]">${downPayout}</div>
        </div>
      </div>

      {geoBlocked && (
        <div className="mb-2 text-center text-[10px] text-[#555]">
          Trading is blocked in your region.
        </div>
      )}

      {pendingSide && (
        <div className={`mb-1.5 rounded-[2px] border px-2 py-1 text-[11px] text-center ${
          yesArmed
            ? 'border-[#27c47c] bg-[#001a0a] text-[#27c47c]'
            : 'border-[#e04f4f] bg-[#1a0000] text-[#e04f4f]'
        }`}>
          {yesArmed ? 'YES armed' : 'NO armed'} — press <kbd className="rounded px-0.5 font-mono text-[10px]">Enter</kbd> to confirm or <kbd className="rounded px-0.5 font-mono text-[10px]">Esc</kbd> to cancel
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5">
        <button
          onClick={buyYes}
          disabled={buyDisabled}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[#27c47c] text-[12px] font-bold text-[#001a0a] tracking-[0.08em] uppercase transition-colors hover:bg-[#34d98a] disabled:cursor-not-allowed disabled:opacity-40 ${
            yesArmed ? 'ring-2 ring-[#27c47c] ring-offset-1 ring-offset-[#131518]' : ''
          }`}
        >
          <span>{buyYesLoading ? 'PLACING…' : 'BUY YES'}</span>
          {!buyYesLoading && <kbd className="rounded-[2px] border border-black/25 bg-black/15 px-1.5 py-[1px] text-[10px] font-mono text-[#001a0a]">Y</kbd>}
        </button>
        <button
          onClick={buyNo}
          disabled={buyDisabled}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[#e04f4f] text-[12px] font-bold text-[#1a0000] tracking-[0.08em] uppercase transition-colors hover:bg-[#f06060] disabled:cursor-not-allowed disabled:opacity-40 ${
            noArmed ? 'ring-2 ring-[#e04f4f] ring-offset-1 ring-offset-[#131518]' : ''
          }`}
        >
          <span>{buyNoLoading ? 'PLACING…' : 'BUY NO'}</span>
          {!buyNoLoading && <kbd className="rounded-[2px] border border-black/25 bg-black/15 px-1.5 py-[1px] text-[10px] font-mono text-[#1a0000]">N</kbd>}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div>
          <div className="text-[10px] text-[#666c77] mb-0.5 tracking-[0.08em] uppercase">
            Stop Loss
            <span className="ml-1 text-[#444] normal-case tracking-normal">% down from entry</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="1" min="1" max="95"
              placeholder="20"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              className="w-full rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-2 py-1 pr-5 text-[11px] text-[#e04f4f] tabular-nums outline-none focus:border-[#e04f4f]"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#555b66]">%</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-0.5">
            {[10, 20, 30].map(v => (
              <button
                key={v}
                onClick={() => setStopLoss(String(v))}
                className={`rounded-[2px] border py-0.5 text-[10px] ${
                  stopLoss === String(v)
                    ? 'border-[#e04f4f] bg-[#1a0000] text-[#e04f4f]'
                    : 'border-[#22242a] bg-[#1a1c20] text-[#888e99] hover:border-[#e04f4f] hover:text-[#e04f4f]'
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#666c77] mb-0.5 tracking-[0.08em] uppercase">
            Take Profit
            <span className="ml-1 text-[#444] normal-case tracking-normal">% up from entry</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="1" min="1" max="500"
              placeholder="50"
              value={takeProfit}
              onChange={e => setTakeProfit(e.target.value)}
              className="w-full rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-2 py-1 pr-5 text-[11px] text-[#27c47c] tabular-nums outline-none focus:border-[#27c47c]"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#555b66]">%</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-0.5">
            {[25, 50, 100].map(v => (
              <button
                key={v}
                onClick={() => setTakeProfit(String(v))}
                className={`rounded-[2px] border py-0.5 text-[10px] ${
                  takeProfit === String(v)
                    ? 'border-[#27c47c] bg-[#001a0a] text-[#27c47c]'
                    : 'border-[#22242a] bg-[#1a1c20] text-[#888e99] hover:border-[#27c47c] hover:text-[#27c47c]'
                }`}
              >
                +{v}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
