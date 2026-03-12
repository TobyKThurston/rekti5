'use client';

interface DepthRowProps {
  side: 'up' | 'down';
  price: string;
  size: string;
  cum: string;
  depth: number;
  rowIndex: number;
}

export function DepthRow({ side, price, size, cum, depth, rowIndex }: DepthRowProps) {
  const isUp = side === 'up';
  const stripe = rowIndex % 2 === 1 ? 'bg-[#131518]' : 'bg-transparent';
  return (
    <div
      className={`relative grid items-center border-b border-[#22242a] px-1.5 py-[2px] text-[11px] leading-[1.1] ${stripe}`}
      style={{ gridTemplateColumns: '1fr auto auto' }}
    >
      <div
        className={`absolute inset-y-0 right-0 ${isUp ? 'bg-[#e04f4f]/10' : 'bg-[#27c47c]/10'}`}
        style={{ width: `${Math.max(8, depth * 0.55)}%` }}
      />
      <span className={`relative z-10 ${isUp ? 'text-[#e04f4f]' : 'text-[#27c47c]'}`}>{price}</span>
      <span className="relative z-10 min-w-[52px] text-right text-[#e8e8e8]">{size}</span>
      <span className="relative z-10 min-w-[52px] text-right text-[#666c77]">{cum}</span>
    </div>
  );
}
