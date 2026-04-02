'use client';
import { useEffect, useRef, useState } from 'react';
import { TypewriterText } from './TypewriterText';

export function ScrollTypewriter({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.8 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref}>
      {active ? (
        <TypewriterText text={text} className={className} speed={32} />
      ) : (
        <span className={className} style={{ visibility: 'hidden' }}>{text}</span>
      )}
    </span>
  );
}
