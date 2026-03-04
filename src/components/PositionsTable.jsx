import { useMemo } from 'react';
import { calcPnl } from '../lib/pnl';

const STATUS_BADGE = {
  EXECUTING:  { label: 'EXEC',      className: 'text-[#f09000]' },
  FILLED:     { label: 'FILLED',    className: 'text-[#27c47c]' },
  CANCELLED:  { label: 'CNCL',      className: 'text-[#666c77]' },
};

export function PositionsTable({ positions, market, closingPositionId, closePosition }) {
  const livePositions = useMemo(() => {
    if (!market) return positions;
    return positions.map(pos => {
      const currentPrice = parseFloat(
        pos.side === 'YES' ? market.yesPrice : market.noPrice
      );
      const sz    = pos.size;
      const entry = pos.entry;
      const pnl   = calcPnl(sz, entry, currentPrice);
      return {
        ...pos,
        currentPrice: currentPrice.toFixed(3),
        pnl:      `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`,
        positive: pnl >= 0,
      };
    });
  }, [positions, market?.yesPrice, market?.noPrice]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#22242a] px-2 py-[4px]">
        <span className="text-[11px] text-[#666c77]">Positions</span>
        <span className="text-[11px] text-[#666c77]">{livePositions.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] leading-tight">
          <thead>
            <tr className="bg-[#1a1c20]">
              {['DIR', 'SIZE', 'ENTRY', 'MARK', 'PNL', 'SL', 'TP', 'STATUS', 'CLOSE'].map((h) => (
                <th
                  key={h}
                  className="border-b border-[#22242a] px-2 py-[3px] text-left text-[10px] tracking-[0.08em] text-[#666c77]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {livePositions.length === 0 ? (
              <tr>
                <td colSpan={9} className="border-b border-[#22242a] px-2 py-[3px] text-[#666c77]">
                  No open positions
                </td>
              </tr>
            ) : (
              livePositions.map((row, i) => {
                const badge = STATUS_BADGE[row.status];
                const isLatest = i === livePositions.length - 1;
                return (
                  <tr key={row.id} className={i % 2 === 1 ? 'bg-[#131518]' : 'bg-transparent'}>
                    <td className={`border-b border-[#22242a] px-2 py-[3px] ${row.positive ? 'text-[#27c47c]' : 'text-[#e04f4f]'}`}>
                      {row.side}
                    </td>
                    <td className="border-b border-[#22242a] px-2 py-[3px]">${row.size.toFixed(2)}</td>
                    <td className="border-b border-[#22242a] px-2 py-[3px] text-[#666c77]">{row.entry.toFixed(3)}</td>
                    <td className="border-b border-[#22242a] px-2 py-[3px] text-[#f5f5f5]">{row.currentPrice}</td>
                    <td className={`border-b border-[#22242a] px-2 py-[3px] ${row.positive ? 'text-[#27c47c]' : 'text-[#e04f4f]'}`}>
                      {row.pnl}
                    </td>
                    <td className="border-b border-[#22242a] px-2 py-[3px] text-[#e04f4f]">
                      {row.stopLoss != null ? row.stopLoss.toFixed(3) : '—'}
                    </td>
                    <td className="border-b border-[#22242a] px-2 py-[3px] text-[#27c47c]">
                      {row.takeProfit != null ? row.takeProfit.toFixed(3) : '—'}
                    </td>
                    <td className="border-b border-[#22242a] px-2 py-[3px]">
                      {badge ? (
                        <span className={`text-[10px] ${badge.className}`}>{badge.label}</span>
                      ) : null}
                    </td>
                    <td className="border-b border-[#22242a] px-2 py-[3px]">
                      <button
                        onClick={() => closePosition(row)}
                        disabled={closingPositionId === row.id}
                        className="rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-1.5 py-[2px] text-[10px] text-[#666c77] hover:border-[#e04f4f] hover:text-[#e04f4f] disabled:opacity-50"
                      >
                        {closingPositionId === row.id ? '…' : 'close'}
                        {isLatest && closingPositionId !== row.id && (
                          <span className="ml-0.5 opacity-40">[C]</span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
