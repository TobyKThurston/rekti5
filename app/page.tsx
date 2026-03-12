import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0d0e11] text-[#e8e8e8]">
      {/* Header */}
      <header className="border-b border-[#22242a] px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-widest text-[#00e676]">REKTI5</span>
          <span className="text-xs text-[#555]">trading cockpit</span>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Markets</h1>
          <p className="text-sm text-[#888]">Select a market to start trading.</p>
        </div>

        {/* Market cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* BTC 5-min card */}
          <Link
            href="/trade/btc-5m"
            className="group relative flex flex-col gap-4 rounded border border-[#22242a] bg-[#131518] p-5 transition-all hover:border-[#00e676]/50 hover:bg-[#161a1e]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-[#f7931a]/10 text-[#f7931a] text-sm font-bold">
                  ₿
                </div>
                <div>
                  <div className="text-sm font-semibold">BTC 5-Min</div>
                  <div className="text-xs text-[#888]">Polymarket</div>
                </div>
              </div>
              <span className="rounded bg-[#00e676]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00e676]">
                Live
              </span>
            </div>

            <p className="text-xs text-[#999] leading-relaxed">
              Binary prediction on BTC price movement over 5-minute windows.
              Trade YES/NO on whether BTC will be up or down.
            </p>

            <div className="flex items-center gap-4 text-[10px] text-[#666] uppercase tracking-wider">
              <span>5m windows</span>
              <span className="text-[#333]">|</span>
              <span>USDC settled</span>
              <span className="text-[#333]">|</span>
              <span>Polygon</span>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[#22242a] pt-3">
              <span className="text-[10px] text-[#555] uppercase tracking-wider">Enter Market</span>
              <span className="text-[#555] transition-transform group-hover:translate-x-1 group-hover:text-[#00e676]">
                →
              </span>
            </div>
          </Link>

          {/* Coming soon placeholder */}
          <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-[#22242a] bg-[#0d0e11] p-5 text-center">
            <span className="text-xs text-[#444]">More markets coming soon</span>
          </div>
        </div>
      </main>
    </div>
  );
}
