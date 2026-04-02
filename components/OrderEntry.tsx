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
      <div className="mb-1 text-[10px] text-[#666c77]">Amount ($)</div>
      <input
        type="number"
        value={amountValue}
        readOnly
        className="mb-1.5 w-full rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-1.5 py-1 text-[12px] text-[#e8e8e8] outline-none focus:border-[#f09000]"
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
              className={`rounded-[2px] border px-1 py-1 text-[11px] ${
                active
                  ? 'border-[#f09000] bg-[#1a1400] text-[#f09000]'
                  : 'border-[#22242a] bg-[#1a1c20] text-[#666c77] hover:border-[#f09000] hover:text-[#f09000]'
              }`}
            >
              ${dollars}
              <span className="ml-0.5 text-[9px] opacity-40">[{key}]</span>
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

      <div className="grid grid-cols-1 gap-1">
        <button
          onClick={buyYes}
          disabled={buyDisabled}
          className={`h-10 w-full rounded-[2px] text-[12px] font-bold text-[#001a0a] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-all ${
            yesArmed
              ? 'bg-[#27c47c] ring-2 ring-[#27c47c] ring-offset-1 ring-offset-[#131518]'
              : 'bg-[#27c47c]'
          }`}
        >
          <span>{buyYesLoading ? 'PLACING…' : 'BUY YES'}</span>
          {!buyYesLoading && <span className="ml-1.5 text-[10px] opacity-50">[Y]</span>}
        </button>
        <button
          onClick={buyNo}
          disabled={buyDisabled}
          className={`h-10 w-full rounded-[2px] text-[12px] font-bold text-[#1a0000] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-all ${
            noArmed
              ? 'bg-[#e04f4f] ring-2 ring-[#e04f4f] ring-offset-1 ring-offset-[#131518]'
              : 'bg-[#e04f4f]'
          }`}
        >
          <span>{buyNoLoading ? 'PLACING…' : 'BUY NO'}</span>
          {!buyNoLoading && <span className="ml-1.5 text-[10px] opacity-50">[N]</span>}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div>
          <div className="text-[9px] text-[#666c77] mb-0.5">
            STOP LOSS
            <span className="ml-1 text-[#444] normal-case">sell if price ≤</span>
          </div>
          <input
            type="number"
            step="0.01" min="0.01" max="0.99"
            placeholder="0.00"
            value={stopLoss}
            onChange={e => setStopLoss(e.target.value)}
            className="w-full rounded-[2px] bg-[#1a1c20] px-2 py-1 text-[11px] text-[#e04f4f] outline-none"
          />
          <div className="mt-1 grid grid-cols-3 gap-0.5">
            {[0.10, 0.20, 0.30].map(v => (
              <button
                key={v}
                onClick={() => setStopLoss(String(v))}
                className={`rounded-[2px] border py-0.5 text-[10px] ${
                  stopLoss === String(v)
                    ? 'border-[#e04f4f] bg-[#1a0000] text-[#e04f4f]'
                    : 'border-[#22242a] bg-[#1a1c20] text-[#666c77] hover:border-[#e04f4f] hover:text-[#e04f4f]'
                }`}
              >
                {v * 100}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[#666c77] mb-0.5">
            TAKE PROFIT
            <span className="ml-1 text-[#444] normal-case">sell if price ≥</span>
          </div>
          <input
            type="number"
            step="0.01" min="0.01" max="0.99"
            placeholder="0.00"
            value={takeProfit}
            onChange={e => setTakeProfit(e.target.value)}
            className="w-full rounded-[2px] bg-[#1a1c20] px-2 py-1 text-[11px] text-[#27c47c] outline-none"
          />
          <div className="mt-1 grid grid-cols-3 gap-0.5">
            {[0.70, 0.80, 0.90].map(v => (
              <button
                key={v}
                onClick={() => setTakeProfit(String(v))}
                className={`rounded-[2px] border py-0.5 text-[10px] ${
                  takeProfit === String(v)
                    ? 'border-[#27c47c] bg-[#001a0a] text-[#27c47c]'
                    : 'border-[#22242a] bg-[#1a1c20] text-[#666c77] hover:border-[#27c47c] hover:text-[#27c47c]'
                }`}
              >
                {v * 100}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
