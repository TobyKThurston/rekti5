'use client';
import { useEffect, useState } from 'react';

export function FloatingNav() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Trigger mount animation next tick
    const t = window.setTimeout(() => setMounted(true), 40);
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
      style={{
        paddingTop: scrolled ? '12px' : '22px',
        transition: 'padding-top 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <nav
        className="pointer-events-auto relative flex items-center justify-between gap-4 rounded-full"
        style={{
          background:
            'linear-gradient(180deg, rgba(19,21,24,0.72) 0%, rgba(13,14,17,0.62) 100%)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          border: '1px solid rgba(240, 144, 0, 0.08)',
          boxShadow: scrolled
            ? '0 12px 44px -14px rgba(240,144,0,0.22), 0 2px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 8px 28px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.04)',
          width: scrolled ? 'min(560px, 94vw)' : 'min(680px, 96vw)',
          height: scrolled ? '48px' : '56px',
          padding: '0 6px 0 20px',
          transform: mounted ? 'translateY(0)' : 'translateY(-24px)',
          opacity: mounted ? 1 : 0,
          transition:
            'width 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1), box-shadow 0.55s ease, transform 0.75s cubic-bezier(0.22,1,0.36,1), opacity 0.75s ease',
        }}
      >
        {/* Subtle inner gradient sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(120% 200% at 50% -40%, rgba(240,144,0,0.10), transparent 60%)',
          }}
        />

        {/* Logo */}
        <a href="/" className="relative flex items-center gap-2 group">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f09000] opacity-60" />
            <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#f09000] shadow-[0_0_8px_#f09000]" />
          </span>
          <span className="text-[#f09000] text-[12px] font-bold tracking-[0.18em] group-hover:text-[#ffa020] transition-colors">
            REKTI5
          </span>
        </a>

        {/* Center links */}
        <div className="relative hidden md:flex items-center gap-7 text-[10px] tracking-[0.14em] uppercase text-[#666c77]">
          <a
            href="#signals"
            className="hover:text-[#e8e8e8] transition-colors relative after:absolute after:bottom-[-6px] after:left-0 after:h-[1px] after:w-0 after:bg-[#f09000] hover:after:w-full after:transition-all after:duration-300"
          >
            Signals
          </a>
          <a
            href="#product"
            className="hover:text-[#e8e8e8] transition-colors relative after:absolute after:bottom-[-6px] after:left-0 after:h-[1px] after:w-0 after:bg-[#f09000] hover:after:w-full after:transition-all after:duration-300"
          >
            Product
          </a>
          <a
            href="#how"
            className="hover:text-[#e8e8e8] transition-colors relative after:absolute after:bottom-[-6px] after:left-0 after:h-[1px] after:w-0 after:bg-[#f09000] hover:after:w-full after:transition-all after:duration-300"
          >
            How it works
          </a>
        </div>

        {/* CTA */}
        <a
          href="/terminal"
          className="relative flex items-center gap-1.5 h-9 px-4 text-black text-[11px] font-bold rounded-full tracking-[0.1em] uppercase transition-all duration-300 group overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, #ffa020 0%, #f09000 45%, #d98000 100%)',
            boxShadow:
              '0 2px 14px rgba(240,144,0,0.42), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.25)',
          }}
        >
          {/* Shimmer sweep */}
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
            style={{
              background:
                'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
            }}
          />
          <span className="relative">Launch</span>
          <span className="relative text-[13px] translate-y-[-0.5px] group-hover:translate-x-0.5 transition-transform">→</span>
        </a>
      </nav>
    </div>
  );
}
