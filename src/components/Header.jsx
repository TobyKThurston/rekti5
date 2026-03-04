export function Header({
  walletAddress,
  walletBalance,
  wrongNetwork,
  btcPrice,
  connectWallet,
  disconnectWallet,
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 h-11 border-b border-[#22242a] bg-[#131518] px-3">
      <div className="flex h-full items-center gap-4">
        <div className="text-[13px] font-bold tracking-[0.12em] text-[#f09000]">Rekti5</div>
        <div className="hidden sm:block h-4 w-px bg-[#22242a]" />
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-[9px] tracking-[0.08em] text-[#f09000] font-semibold">ORACLE</span>
          <span className="text-[13px] font-bold text-[#f5f5f5]">
            {btcPrice
              ? `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </span>
          <span className="text-[9px] text-[#666c77]">Kraken BTC/USD</span>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#f09000]"
            style={{ boxShadow: '0 0 4px #f09000' }}
          />
        </div>
        <div className="flex-1" />
        {walletAddress ? (
          <button
            onClick={disconnectWallet}
            className="flex items-center gap-2 rounded-[2px] border border-[#22242a] bg-[#1a1c20] px-2.5 py-1 text-[11px] hover:border-[#3a3d45]"
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#27c47c]"
              style={{ boxShadow: '0 0 4px #27c47c' }}
            />
            <span className="text-[#e8e8e8]">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
            <span className="text-[#666c77]">|</span>
            <span className="text-[#e8e8e8]">${parseFloat(walletBalance).toFixed(2)}</span>
            {wrongNetwork && (
              <span className="rounded-[2px] bg-[#e04f4f]/20 px-1 py-0.5 text-[9px] text-[#e04f4f]">
                WRONG NET
              </span>
            )}
            <span className="text-[#666c77] text-[10px]">USDC · Polygon</span>
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="rounded-[2px] border border-[#f09000] px-2.5 py-1 text-[11px] text-[#f09000] hover:bg-[#1a1400]"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
