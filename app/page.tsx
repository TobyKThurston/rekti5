import { TypewriterText } from '@/components/TypewriterText';
import { ParallaxSection } from '@/components/ParallaxSection';
import { ScrollTypewriter } from '@/components/ScrollTypewriter';
import { FloatingNav } from '@/components/FloatingNav';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0d0e11] font-mono text-[#e8e8e8] overflow-x-hidden">

      {/* Floating glass navigation */}
      <FloatingNav />

      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-screen flex items-center border-b border-[#22242a] pt-28 pb-20">
        {/* Animated background: grid + drifting glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Dot grid */}
          <div className="absolute inset-0 bg-grid mask-radial-fade opacity-[0.65]" />

          {/* Orange glow blob */}
          <div
            className="absolute blob-a"
            style={{
              top: '12%',
              left: '8%',
              width: '520px',
              height: '520px',
              background:
                'radial-gradient(circle, rgba(240,144,0,0.22) 0%, rgba(240,144,0,0.07) 35%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          {/* Green glow blob */}
          <div
            className="absolute blob-b"
            style={{
              bottom: '8%',
              right: '6%',
              width: '480px',
              height: '480px',
              background:
                'radial-gradient(circle, rgba(39,196,124,0.14) 0%, rgba(39,196,124,0.05) 35%, transparent 70%)',
              filter: 'blur(48px)',
            }}
          />
          {/* Vertical scanline gradient */}
          <div
            className="absolute inset-x-0 top-0 h-[60vh]"
            style={{
              background:
                'linear-gradient(180deg, rgba(240,144,0,0.035) 0%, transparent 60%)',
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* ─── Left: copy ─── */}
          <div className="flex flex-col gap-6">
            {/* Live status pill */}
            <div className="rise-1 inline-flex items-center gap-2 self-start px-3 h-7 rounded-full border border-[#22242a] bg-[#131518]/80 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#27c47c] dot-pulse" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#27c47c]" />
              </span>
              <span className="text-[#27c47c] text-[9px] font-bold tracking-[0.16em] uppercase">
                Live · Polymarket CLOB
              </span>
              <span className="text-[#22242a] text-[9px]">|</span>
              <span className="text-[#666c77] text-[9px] tracking-[0.14em] uppercase">
                BTC 5-min only
              </span>
            </div>

            {/* Headline */}
            <h1 className="rise-2 text-[28px] sm:text-[32px] lg:text-[36px] font-bold leading-[1.15] tracking-[0.015em] text-[#e8e8e8]">
              Trade BTC 5-min faster than{" "}
              <span className="relative inline-block">
                <TypewriterText
                  text="the market reprices."
                  className="bg-gradient-to-r from-[#ffa020] via-[#f09000] to-[#d98000] bg-clip-text text-transparent"
                />
              </span>
            </h1>

            {/* Sub */}
            <p className="rise-3 text-[14px] sm:text-[15px] text-[#8a919c] leading-relaxed tracking-[0.02em] max-w-[520px]">
              Each 5-minute BTC window opens and closes fast. Whale flow detection and
              momentum scoring surface mispricing before it closes — sub-100ms CLOB
              execution means you&apos;re in before the price corrects.
            </p>

            {/* CTAs */}
            <div className="rise-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2">
              <a
                href="/terminal"
                className="group relative flex items-center justify-center gap-2 h-12 px-7 text-black text-[13px] font-bold rounded-full tracking-[0.08em] uppercase overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, #ffa020 0%, #f09000 45%, #d98000 100%)',
                  boxShadow:
                    '0 10px 30px -6px rgba(240,144,0,0.55), 0 2px 10px rgba(240,144,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.22)',
                }}
              >
                <span className="shimmer-sweep absolute inset-0" />
                <span className="relative">Launch Terminal</span>
                <span className="relative text-[15px] group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#product"
                className="flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-[#22242a] bg-[#131518]/60 backdrop-blur-sm text-[#e8e8e8] text-[12px] font-semibold tracking-[0.1em] uppercase hover:border-[#f09000]/60 hover:text-[#f09000] transition-all"
              >
                See how it works
              </a>
            </div>

            {/* Stat strip */}
            <div className="rise-5 grid grid-cols-3 gap-3 mt-6 max-w-[520px]">
              {[
                { k: '~87ms', v: 'AVG EXEC' },
                { k: 'CLOB', v: 'DIRECT' },
                { k: 'NON-CUSTODIAL', v: 'YOUR KEYS' },
              ].map((s) => (
                <div
                  key={s.k}
                  className="flex flex-col gap-1 px-3 py-2 rounded-[3px] border border-[#22242a] bg-[#131518]/50 backdrop-blur-sm"
                >
                  <span className="text-[#e8e8e8] text-[11px] font-bold tracking-[0.06em]">
                    {s.k}
                  </span>
                  <span className="text-[#444950] text-[8px] tracking-[0.14em] uppercase">
                    {s.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Right: terminal mockup ─── */}
          <ParallaxSection speed={0.1} immediate>
            <div className="relative">
              {/* Glow backdrop */}
              <div
                aria-hidden
                className="absolute -inset-6 -z-10 rounded-[12px] opacity-70"
                style={{
                  background:
                    'radial-gradient(circle at 50% 40%, rgba(240,144,0,0.22), transparent 65%)',
                  filter: 'blur(24px)',
                }}
              />

              <div
                className="relative rounded-[4px] p-4 flex flex-col gap-3 min-h-[360px] border border-[#22242a]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(22,24,28,0.95) 0%, rgba(15,16,19,0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow:
                    '0 30px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(240,144,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                {/* Mockup title bar */}
                <div className="flex items-center justify-between border-b border-[#22242a] pb-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#e04f4f]/70" />
                      <span className="w-2 h-2 rounded-full bg-[#f09000]/70" />
                      <span className="w-2 h-2 rounded-full bg-[#27c47c]/70" />
                    </div>
                    <span className="text-[#666c77] text-[9px] font-bold tracking-[0.14em] uppercase ml-1">
                      rekti5 · terminal
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[#27c47c] text-[9px] tracking-[0.1em] uppercase">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#27c47c] dot-pulse" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#27c47c]" />
                    </span>
                    Connected
                  </span>
                </div>

                {/* Price display area */}
                <div className="bg-[#0d0e11] border border-[#22242a] rounded-[2px] p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[#444950] text-[8px] tracking-[0.1em] uppercase mb-1">BTC / 5M</p>
                    <p className="text-[24px] font-bold text-[#e8e8e8] tracking-tight">$83,241</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#444950] text-[8px] tracking-[0.1em] uppercase mb-1">STRIKE</p>
                    <p className="text-[18px] font-bold text-[#f09000]">$83,000</p>
                  </div>
                </div>

                {/* Signal rows */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#27c47c] text-[8px]">●</span>
                    <span className="text-[#444950] text-[8px] tracking-[0.1em] uppercase">Live signals · Updated every 250ms</span>
                  </div>
                  {[
                    { label: "WHALE BUY", val: "+2.4σ", color: "#27c47c", accent: "border-l-2 border-l-[#27c47c]" },
                    { label: "MOMENTUM", val: "STRONG", color: "#27c47c", accent: "border-l-2 border-l-[#27c47c]" },
                    { label: "VOL SPIKE", val: "3.1×", color: "#f09000", accent: "border-l-2 border-l-[#f09000]" },
                    { label: "SPREAD", val: "0.8¢", color: "#e8e8e8", accent: "" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`flex items-center justify-between bg-[#0d0e11] px-3 py-[5px] border border-[#22242a] rounded-[2px] ${s.accent}`}
                    >
                      <span className="text-[#666c77] text-[9px] tracking-[0.08em] uppercase">{s.label}</span>
                      <span className="text-[9px] font-bold tracking-[0.06em]" style={{ color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                </div>

                {/* Trade buttons mockup */}
                <div className="flex gap-2 mt-auto">
                  <div className="flex-1 h-9 flex items-center justify-center bg-[#0d1a0f] border border-[#27c47c] rounded-[2px] text-[#27c47c] text-[10px] font-bold tracking-[0.1em] shadow-[inset_0_0_12px_rgba(39,196,124,0.08)]">
                    Y — YES
                  </div>
                  <div className="flex-1 h-9 flex items-center justify-center bg-[#1a0d0d] border border-[#e04f4f] rounded-[2px] text-[#e04f4f] text-[10px] font-bold tracking-[0.1em] shadow-[inset_0_0_12px_rgba(224,79,79,0.08)]">
                    N — NO
                  </div>
                </div>
              </div>
            </div>
          </ParallaxSection>
        </div>
      </section>

      {/* ─────────── Edge Signals ─────────── */}
      <section id="signals" className="border-b border-[#22242a] bg-[#0f1114] overflow-hidden">
        <ParallaxSection speed={0.07}>
          <div className="max-w-6xl mx-auto px-6 py-10">
            <p className="text-[#f09000] text-[9px] font-bold tracking-[0.18em] uppercase mb-5">
              // Edge signals
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "WHALE FLOW",   desc: "Large-order detection across the book" },
                { label: "MOMENTUM",     desc: "Directional strength, scored live" },
                { label: "VOL SPIKE",    desc: "Abnormal volatility flagged in real time" },
                { label: "SPREAD WIDTH", desc: "Liquidity gauge for execution confidence" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="group relative border border-[#22242a] rounded-[3px] px-4 py-3 flex flex-col gap-1.5 bg-[#131518]/60 backdrop-blur-sm hover:border-[#f09000]/50 hover:bg-[#131518] transition-all duration-300"
                >
                  <span className="text-[#e8e8e8] text-[10px] font-bold tracking-[0.14em]">{s.label}</span>
                  <span className="text-[#666c77] text-[10px] tracking-[0.02em] leading-relaxed">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </ParallaxSection>
      </section>

      {/* ─────────── Product ─────────── */}
      <section id="product" className="py-24 border-b border-[#22242a] overflow-hidden">
        <ParallaxSection speed={0.08}>
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[#f09000] text-[9px] font-bold tracking-[0.18em] uppercase mb-3">
              // Product
            </p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#e8e8e8] tracking-[0.02em] mb-10 max-w-xl leading-[1.25]">
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
                  className="group relative rounded-[4px] p-6 flex flex-col gap-3 border border-[#22242a] bg-[#131518]/70 backdrop-blur-sm hover:border-[#f09000]/30 transition-all duration-500 hover:-translate-y-0.5"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-6 top-0 h-px opacity-40"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)`,
                    }}
                  />
                  <span
                    className="text-[10px] font-bold tracking-[0.16em] uppercase"
                    style={{ color: card.accent }}
                  >
                    {card.label}
                  </span>
                  <h3 className="text-[15px] font-bold text-[#e8e8e8] tracking-[0.015em]">{card.title}</h3>
                  <p className="text-[13px] text-[#8a919c] leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </ParallaxSection>
      </section>

      {/* ─────────── How It Works ─────────── */}
      <section id="how" className="py-24 border-b border-[#22242a] overflow-hidden">
        <ParallaxSection speed={0.08}>
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[#f09000] text-[9px] font-bold tracking-[0.18em] uppercase mb-3">
              // How it works
            </p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#e8e8e8] tracking-[0.02em] mb-10 max-w-xl leading-[1.25]">
              From zero to first trade in seconds.
            </h2>
            <div className="flex flex-col lg:flex-row items-start lg:items-stretch gap-6 lg:gap-0">
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
                <div key={step.n} className="flex lg:flex-1 items-stretch gap-4 lg:gap-0 w-full">
                  <div className="relative rounded-[4px] p-6 flex flex-col gap-2 flex-1 border border-[#22242a] bg-[#131518]/70 backdrop-blur-sm hover:border-[#f09000]/40 transition-colors">
                    <span className="text-[#f09000] text-[22px] font-bold tracking-tight">{step.n}</span>
                    <h3 className="text-[14px] font-bold text-[#e8e8e8] tracking-[0.02em]">{step.title}</h3>
                    <p className="text-[12px] text-[#8a919c] leading-relaxed">{step.body}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden lg:flex items-center px-3 text-[#444950] text-[18px] self-center">→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ParallaxSection>
      </section>

      {/* ─────────── Trust Strip ─────────── */}
      <section className="border-b border-[#22242a] bg-[#0f1114] overflow-hidden">
        <ParallaxSection speed={0.05}>
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex flex-wrap items-center justify-center gap-x-0 gap-y-3">
              {[
                "Trades executed via Polymarket's CLOB",
                "You retain full custody via MetaMask",
                "Rekti5 does not hold user funds",
              ].map((item, i) => (
                <span key={item} className="flex items-center whitespace-nowrap">
                  {i > 0 && <span className="text-[#22242a] mx-4 text-[9px]">|</span>}
                  <span className="text-[#666c77] text-[9px] tracking-[0.14em] uppercase">{item}</span>
                </span>
              ))}
            </div>
          </div>
        </ParallaxSection>
      </section>

      {/* ─────────── Final CTA ─────────── */}
      <section className="relative min-h-screen bg-[#0d0e11] overflow-hidden flex items-center justify-center">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(240,144,0,0.12), transparent 70%)',
          }}
        />
        <ParallaxSection speed={0.12} entranceOffset={70}>
          <div className="relative flex flex-col items-center gap-10 text-center px-6">
            <h2 className="text-[26px] sm:text-[32px] font-bold text-[#e8e8e8] tracking-[0.02em] min-h-[2em] flex items-center">
              <ScrollTypewriter text="Start trading with an edge." />
            </h2>
            <a
              href="/terminal"
              className="group relative flex items-center justify-center gap-2 w-80 h-14 text-black text-[15px] font-bold rounded-full tracking-[0.08em] uppercase overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                background:
                  'linear-gradient(180deg, #ffa020 0%, #f09000 45%, #d98000 100%)',
                boxShadow:
                  '0 20px 50px -10px rgba(240,144,0,0.55), 0 4px 20px rgba(240,144,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.25)',
              }}
            >
              <span className="shimmer-sweep absolute inset-0" />
              <span className="relative">Launch Terminal</span>
              <span className="relative text-[17px] group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </ParallaxSection>
      </section>

      {/* ─────────── Footer ─────────── */}
      <footer className="border-t border-[#22242a] bg-[#0f1114]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="text-[#f09000] text-[11px] font-bold tracking-[0.18em]">REKTI5</a>
          <span className="text-[#666c77] text-[9px] tracking-[0.12em] uppercase">
            Built on Polymarket · Polygon
          </span>
        </div>
      </footer>

    </div>
  );
}
