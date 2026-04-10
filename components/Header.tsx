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
    <header
      className="fixed inset-x-0 top-0 z-20 h-11 border-b border-[#22242a] px-3 backdrop-blur-md"
      style={{
        background:
          'linear-gradient(180deg, rgba(19,21,24,0.92) 0%, rgba(15,16,19,0.92) 100%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.02) inset, 0 6px 18px -12px rgba(0,0,0,0.6)',
      }}
    >
      <div className="flex h-full items-center gap-4">
        {/* Logo with pulsing dot */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f09000] opacity-60" />
            <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#f09000] shadow-[0_0_8px_#f09000]" />
          </span>
          <span className="text-[13px] font-bold tracking-[0.18em] text-[#f09000] group-hover:text-[#ffa020] transition-colors">
            REKTI5
          </span>
        </Link>

        <div className="hidden sm:block h-4 w-px bg-[#22242a]" />

        {/* Oracle BTC price */}
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-[9px] tracking-[0.14em] text-[#666c77] font-semibold uppercase">
            Oracle
          </span>
          <span className="text-[13px] font-bold text-[#f5f5f5] tabular-nums">
            {btcPrice
              ? `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </span>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#f09000]"
            style={{ boxShadow: '0 0 6px #f09000' }}
          />
        </div>

        <div className="flex-1" />

        {/* Wallet */}
        {walletAddress ? (
          <button
            onClick={disconnectWallet}
            className="group flex items-center gap-2 rounded-full border border-[#22242a] bg-[#1a1c20]/80 backdrop-blur-sm px-3 py-[5px] text-[11px] transition-all hover:border-[#27c47c]/60 hover:bg-[#1a1c20]"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#27c47c] dot-pulse" />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#27c47c]"
                style={{ boxShadow: '0 0 6px #27c47c' }}
              />
            </span>
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
              className="relative flex items-center gap-1.5 h-7 px-4 rounded-full text-black text-[11px] font-bold tracking-[0.08em] uppercase overflow-hidden transition-all hover:brightness-110"
              style={{
                background:
                  'linear-gradient(180deg, #ffa020 0%, #f09000 45%, #d98000 100%)',
                boxShadow:
                  '0 2px 12px rgba(240,144,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.22)',
              }}
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
