'use client';

import Link from 'next/link';
import { useBtcPrice } from '@/hooks/useBtcPrice';

interface HeaderProps {
  walletAddress: string | null;
  walletBalance: string | null;
  wrongNetwork: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

export function Header({
  walletAddress,
  walletBalance,
  wrongNetwork,
  connectWallet,
  disconnectWallet,
}: HeaderProps) {
  const btcPrice = useBtcPrice();
  return (
    <header className="fixed inset-x-0 top-0 z-20 h-11 border-b border-[#22242a] bg-[#131518] px-3">
      <div className="flex h-full items-center gap-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-[#f09000]" />
          <span className="text-[13px] font-bold tracking-[0.18em] text-[#f09000] group-hover:text-[#ffa020] transition-colors">
            REKTI5
          </span>
        </Link>

        <div className="hidden sm:block h-4 w-px bg-[#22242a]" />

        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-[9px] tracking-[0.14em] text-[#666c77] font-semibold uppercase">
            Oracle
          </span>
          <span className="text-[13px] font-bold text-[#f5f5f5] tabular-nums">
            {btcPrice
              ? `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f09000]" />
        </div>

        <div className="flex-1" />

        {walletAddress ? (
          <button
            onClick={disconnectWallet}
            className="group flex items-center gap-2 rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-3 py-[5px] text-[11px] transition-colors hover:border-[#27c47c]/60"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#27c47c]" />
            <span className="text-[#e8e8e8] tabular-nums">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
            <span className="text-[#333740]">|</span>
            <span className="text-[#e8e8e8] font-semibold tabular-nums">
              ${parseFloat(walletBalance ?? '0').toFixed(2)}
            </span>
            {wrongNetwork && (
              <span className="rounded-full bg-[#e04f4f]/15 border border-[#e04f4f]/40 px-1.5 py-0.5 text-[9px] text-[#e04f4f] tracking-[0.08em]">
                WRONG NET
              </span>
            )}
            <span className="text-[#666c77] text-[9px] tracking-[0.06em] uppercase">USDC · Polygon</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-[9px] text-[#555b66] tracking-[0.12em] uppercase">Polygon · USDC</span>
            <button
              onClick={connectWallet}
              className="flex items-center h-7 px-4 rounded-[2px] bg-[#f09000] text-[#1a0c00] text-[11px] font-bold tracking-[0.08em] uppercase transition-colors hover:bg-[#ffa820]"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
