'use client';
import { Fragment, useEffect, useState } from 'react';

export function TypewriterText({ text, className, speed = 60 }: { text: string; className?: string; speed?: number }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setCount(0);
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setCount(i);
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  const chars = Array.from(text);

  return (
    <span className={className}>
      {chars.map((char, i) => (
        <Fragment key={i}>
          {!done && i === count && (
            <span
              aria-hidden
              className="animate-pulse"
              style={{ color: '#f09000', WebkitTextFillColor: '#f09000' }}
            >
              |
            </span>
          )}
          <span style={{ visibility: i < count ? 'visible' : 'hidden' }}>
            {char}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
