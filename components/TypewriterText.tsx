'use client';
import { useEffect, useState } from 'react';

type Props = {
  text: string | string[];
  className?: string;
  speed?: number;
  deleteSpeed?: number;
  holdMs?: number;
  loop?: boolean;
};

export function TypewriterText({
  text,
  className,
  speed = 55,
  deleteSpeed = 28,
  holdMs = 1600,
  loop,
}: Props) {
  const phrases = Array.isArray(text) ? text : [text];
  const cycling = (loop ?? (phrases.length > 1)) && phrases.length > 0;
  const longest = phrases.reduce((a, b) => (a.length >= b.length ? a : b), '');

  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<'type' | 'hold' | 'delete'>('type');

  useEffect(() => {
    const current = phrases[idx] ?? '';
    let t: ReturnType<typeof setTimeout> | undefined;

    if (phase === 'type') {
      if (chars < current.length) {
        t = setTimeout(() => setChars(c => c + 1), speed);
      } else if (cycling) {
        t = setTimeout(() => setPhase('hold'), 0);
      }
    } else if (phase === 'hold') {
      t = setTimeout(() => setPhase('delete'), holdMs);
    } else {
      if (chars > 0) {
        t = setTimeout(() => setChars(c => c - 1), deleteSpeed);
      } else {
        setIdx(i => (i + 1) % phrases.length);
        setPhase('type');
      }
    }
    return () => { if (t) clearTimeout(t); };
  }, [chars, phase, idx, phrases, speed, deleteSpeed, holdMs, cycling]);

  const current = phrases[idx] ?? '';
  const visible = current.slice(0, chars);
  const cursorDone = !cycling && chars >= current.length;

  return (
    <span className="relative inline-block align-baseline whitespace-pre-wrap">
      <span aria-hidden className={`invisible ${className ?? ''}`}>{longest}</span>
      <span className="absolute inset-0">
        <span className={className}>{visible}</span>
        {!cursorDone && (
          <span
            aria-hidden
            className="tw-cursor"
            style={{ color: '#f09000', WebkitTextFillColor: '#f09000' }}
          >
            ▍
          </span>
        )}
      </span>
    </span>
  );
}
