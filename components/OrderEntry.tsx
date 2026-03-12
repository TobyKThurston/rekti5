'use client';

interface OrderEntryProps {
  sizePct: number;
  setSizePct: (v: number) => void;
  orderType: string;
  setOrderType: (v: string) => void;
  amountValue: string;
  feeEstimate: string;
  totalCost: string;
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
  orderType,
  setOrderType,
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
    { pct: 25,  key: '1' },
    { pct: 50,  key: '2' },
    { pct: 75,  key: '3' },
    { pct: 100, key: '4' },
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
      <div className="mb-2 grid grid-cols-4 gap-1">
        {SIZE_PRESETS.map(({ pct, key }) => (
          <button
            key={pct}
            onClick={() => setSizePct(pct)}
            className={`rounded-[2px] border px-1 py-1 text-[11px] ${
              sizePct === pct
                ? 'border-[#f09000] bg-[#1a1400] text-[#f09000]'
                : 'border-[#22242a] bg-[#1a1c20] text-[#666c77] hover:border-[#f09000] hover:text-[#f09000]'
            }`}
          >
            {pct}%
            <span className="ml-0.5 text-[9px] opacity-40">[{key}]</span>
          </button>
        ))}
      </div>
      <div className="mb-1.5 flex gap-1">
        {['market', 'limit'].map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex-1 rounded-[2px] border px-1.5 py-1 text-[11px] ${
              orderType === type
                ? 'border-[#f09000] bg-[#1a1400] text-[#f09000]'
                : 'border-[#22242a] bg-[#1a1c20] text-[#666c77] hover:border-[#f09000] hover:text-[#f09000]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
      {orderType === 'limit' && (
        <input
          type="text"
          defaultValue="0.610"
          className="mb-1.5 w-full rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-1.5 py-1 text-[12px] text-[#e8e8e8] outline-none focus:border-[#f09000]"
        />
      )}
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
          <div className="text-[9px] text-[#666c77] mb-0.5">STOP LOSS</div>
          <input
            type="number"
            step="0.01" min="0.01" max="0.99"
            placeholder="—"
            value={stopLoss}
            onChange={e => setStopLoss(e.target.value)}
            className="w-full rounded-[2px] bg-[#1a1c20] px-2 py-1 text-[11px] text-[#e04f4f] outline-none"
          />
        </div>
        <div>
          <div className="text-[9px] text-[#666c77] mb-0.5">TAKE PROFIT</div>
          <input
            type="number"
            step="0.01" min="0.01" max="0.99"
            placeholder="—"
            value={takeProfit}
            onChange={e => setTakeProfit(e.target.value)}
            className="w-full rounded-[2px] bg-[#1a1c20] px-2 py-1 text-[11px] text-[#27c47c] outline-none"
          />
        </div>
      </div>
    </section>
  );
}
