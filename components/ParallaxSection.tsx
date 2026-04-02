'use client';
import { useEffect, useRef, useState } from 'react';

export function ParallaxSection({
  children,
  className = '',
  speed = 0.07,
  immediate = false,
  entranceOffset = 22,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  immediate?: boolean;
  entranceOffset?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(immediate);

  useEffect(() => {
    const outer = outerRef.current;
    const parallax = parallaxRef.current;
    if (!outer || !parallax) return;

    if (!immediate) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        },
        { threshold: 0.08 }
      );
      observer.observe(outer);
    }

    const onScroll = () => {
      const rect = outer.getBoundingClientRect();
      const centerOffset = (rect.top + rect.height / 2) - window.innerHeight / 2;
      parallax.style.transform = `translateY(${centerOffset * speed}px)`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [speed, immediate]);

  return (
    <div ref={outerRef} className={className}>
      <div ref={parallaxRef} style={{ willChange: 'transform' }}>
        <div
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : `translateY(${entranceOffset}px)`,
            transition: 'opacity 0.65s ease, transform 0.65s ease',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
