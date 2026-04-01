import { TypewriterText } from '@/components/TypewriterText';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0e11] font-mono text-[#e8e8e8]">

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 h-11 flex items-center justify-between px-6 bg-[#0d0e11] border-b border-[#22242a]">
        <a href="/" className="text-[#f09000] text-[13px] font-bold tracking-[0.12em]">REKTI5</a>
        <a
          href="/terminal"
          className="px-3 h-7 flex items-center text-[12px] border border-[#22242a] text-[#e8e8e8] rounded-[2px] tracking-[0.05em] hover:border-[#f09000] hover:text-[#f09000] transition-colors"
        >
          Launch Terminal →
        </a>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center border-b border-[#22242a]">
        <div className="max-w-6xl mx-auto px-6 w-full py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="flex flex-col gap-6">
            <p className="text-[#f09000] text-[10px] font-bold tracking-[0.14em] uppercase">
              BTC / 5-MIN MARKETS
            </p>
            <h1 className="text-[36px] font-bold leading-tight tracking-[0.03em] text-[#e8e8e8]">
              Trade Polymarket BTC faster.{" "}
              <TypewriterText text="Find the edge." className="text-[#f09000]" />
            </h1>
            <p className="text-[14px] text-[#666c77] leading-relaxed tracking-[0.03em]">
              Real-time signals, sub-100ms execution, and one-click trading built for 5-minute BTC markets.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="/terminal"
                className="h-10 flex items-center justify-center bg-[#f09000] text-black text-[13px] font-bold rounded-[2px] tracking-[0.06em] hover:bg-[#d98000] transition-colors"
              >
                Launch Terminal →
              </a>
              <p className="text-[#444950] text-[9px] text-center tracking-[0.08em] uppercase">
                Runs on Polymarket · You keep custody via MetaMask
              </p>
            </div>
          </div>

          {/* Right: Terminal Mockup */}
          <div className="bg-[#131518] border border-[#22242a] rounded-[2px] p-4 flex flex-col gap-3 min-h-[340px]">
            {/* Mockup title bar */}
            <div className="flex items-center justify-between border-b border-[#22242a] pb-2 mb-1">
              <span className="text-[#f09000] text-[9px] font-bold tracking-[0.14em] uppercase">[LIVE TERMINAL]</span>
              <span className="text-[#27c47c] text-[9px] tracking-[0.06em]">● CONNECTED</span>
            </div>

            {/* Price display area */}
            <div className="bg-[#0d0e11] border border-[#22242a] rounded-[2px] p-3 flex items-center justify-between">
              <div>
                <p className="text-[#444950] text-[8px] tracking-[0.1em] uppercase mb-1">BTC / 5M</p>
                <p className="text-[22px] font-bold text-[#e8e8e8] tracking-tight">$83,241</p>
              </div>
              <div className="text-right">
                <p className="text-[#444950] text-[8px] tracking-[0.1em] uppercase mb-1">STRIKE</p>
                <p className="text-[16px] font-bold text-[#f09000]">$83,000</p>
              </div>
            </div>

            {/* Signal rows */}
            <div className="flex flex-col gap-1">
              {[
                { label: "WHALE BUY", val: "+2.4σ", color: "#27c47c" },
                { label: "MOMENTUM", val: "STRONG", color: "#27c47c" },
                { label: "VOL SPIKE", val: "3.1×", color: "#f09000" },
                { label: "SPREAD", val: "0.8¢", color: "#e8e8e8" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between bg-[#0d0e11] px-3 py-[5px] border border-[#22242a] rounded-[2px]"
                >
                  <span className="text-[#666c77] text-[9px] tracking-[0.08em] uppercase">{s.label}</span>
                  <span className="text-[9px] font-bold tracking-[0.06em]" style={{ color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Trade buttons mockup */}
            <div className="flex gap-2 mt-auto">
              <div className="flex-1 h-8 flex items-center justify-center bg-[#0d1a0f] border border-[#27c47c] rounded-[2px] text-[#27c47c] text-[10px] font-bold tracking-[0.1em]">
                Y — YES
              </div>
              <div className="flex-1 h-8 flex items-center justify-center bg-[#1a0d0d] border border-[#e04f4f] rounded-[2px] text-[#e04f4f] text-[10px] font-bold tracking-[0.1em]">
                N — NO
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof Strip */}
      <section className="border-b border-[#22242a] bg-[#131518]">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-0 gap-y-3 overflow-x-auto">
            {[
              "Sub-100ms WebSocket order book",
              "Keyboard trading  Y / N / Enter",
              "Whale + momentum signals",
              "Built for 5-min BTC markets",
            ].map((item, i) => (
              <span key={item} className="flex items-center whitespace-nowrap">
                {i > 0 && <span className="text-[#22242a] mx-4 text-[11px]">|</span>}
                <span className="text-[#666c77] text-[11px] tracking-[0.08em] uppercase">{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section className="py-20 border-b border-[#22242a]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-[18px] font-bold text-[#e8e8e8] tracking-[0.03em] mb-10">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                accent: "#f09000",
                label: "SPEED",
                title: "Sub-100ms execution",
                body: "WebSocket order book feed with direct CLOB API integration. No delays, no middlemen — just instant order placement.",
              },
              {
                accent: "#27c47c",
                label: "SIGNALS",
                title: "Real-time market intelligence",
                body: "Whale flow detection, momentum scoring, and volatility alerts surface the edge before the market moves.",
              },
              {
                accent: "#e8e8e8",
                label: "FOCUS",
                title: "One market. Maximum clarity.",
                body: "Purpose-built for BTC 5-min Polymarket contracts. No noise, no distraction — just the data that matters.",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-[#131518] border border-[#22242a] rounded-[2px] p-5 flex flex-col gap-3"
              >
                <span
                  className="text-[10px] font-bold tracking-[0.14em] uppercase"
                  style={{ color: card.accent }}
                >
                  {card.label}
                </span>
                <h3 className="text-[13px] font-bold text-[#e8e8e8] tracking-[0.03em]">{card.title}</h3>
                <p className="text-[13px] text-[#666c77] leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-b border-[#22242a]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-[18px] font-bold text-[#e8e8e8] tracking-[0.03em] mb-10">
            From zero to first trade in seconds.
          </h2>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-0">
            {[
              {
                n: "01",
                title: "Connect MetaMask",
                body: "Approve on Polygon. No sign-up, no KYC. You own your keys.",
              },
              {
                n: "02",
                title: "Watch BTC vs strike",
                body: "Live price, signals, and order book update in real time.",
              },
              {
                n: "03",
                title: "Press Y or N",
                body: "One keystroke submits your trade directly to Polymarket's CLOB.",
              },
            ].map((step, i) => (
              <div key={step.n} className="flex lg:flex-1 items-start lg:items-stretch gap-4 lg:gap-0 w-full">
                <div className="bg-[#131518] border border-[#22242a] rounded-[2px] p-5 flex flex-col gap-2 flex-1">
                  <span className="text-[#f09000] text-[18px] font-bold tracking-tight">{step.n}</span>
                  <h3 className="text-[13px] font-bold text-[#e8e8e8] tracking-[0.03em]">{step.title}</h3>
                  <p className="text-[12px] text-[#666c77] leading-relaxed">{step.body}</p>
                </div>
                {i < 2 && (
                  <div className="hidden lg:flex items-center px-3 text-[#444950] text-[18px] self-center">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-b border-[#22242a] bg-[#131518]">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-0 gap-y-3">
            {[
              "Trades executed via Polymarket's CLOB",
              "You retain full custody via MetaMask",
              "Rekti5 does not hold user funds",
            ].map((item, i) => (
              <span key={item} className="flex items-center whitespace-nowrap">
                {i > 0 && <span className="text-[#22242a] mx-4 text-[9px]">|</span>}
                <span className="text-[#444950] text-[9px] tracking-[0.08em] uppercase">{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-6 text-center">
          <h2 className="text-[24px] font-bold text-[#e8e8e8] tracking-[0.03em]">
            Start trading with an edge.
          </h2>
          <a
            href="/terminal"
            className="w-48 h-10 flex items-center justify-center bg-[#f09000] text-black text-[13px] font-bold rounded-[2px] tracking-[0.06em] hover:bg-[#d98000] transition-colors"
          >
            Launch Terminal →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#22242a] bg-[#131518]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-[#f09000] text-[11px] font-bold tracking-[0.12em]">REKTI5</a>
          <span className="text-[#444950] text-[9px] tracking-[0.06em] uppercase">
            Built on Polymarket · Polygon
          </span>
        </div>
      </footer>

    </div>
  );
}
