'use client';

import { useEffect, useRef, useState } from 'react';

interface FlashNumberProps {
  value: string;
  className?: string;
}

export function FlashNumber({ value, className = '' }: FlashNumberProps) {
  const prevRef = useRef(value);
  const [state, setState] = useState<{ key: number; cls: string }>({ key: 0, cls: '' });

  useEffect(() => {
    if (value === prevRef.current) return;
    const prev = parseFloat(prevRef.current.replace(/[^0-9.-]/g, ''));
    const curr = parseFloat(value.replace(/[^0-9.-]/g, ''));
    prevRef.current = value;
    const cls = !isNaN(prev) && !isNaN(curr)
      ? curr > prev ? 'flash-up' : curr < prev ? 'flash-down' : ''
      : '';
    setState(s => ({ key: s.key + 1, cls }));
  }, [value]);

  return (
    <span key={state.key} className={`${className} ${state.cls}`.trim()}>
      {value}
    </span>
  );
}
