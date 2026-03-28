'use client';

import { useEffect, useState } from 'react';

interface Slot {
  char: string;
  prevChar: string;
  animKey: number;
  dir: 'up' | 'down';
}

interface Props {
  value: string;
  className?: string;
}

export function ScrollingNumber({ value, className }: Props) {
  const str = String(value ?? '');
  const [slots, setSlots] = useState<Slot[]>(() =>
    str.split('').map((ch) => ({ char: ch, prevChar: ch, animKey: 0, dir: 'up' as const }))
  );

  useEffect(() => {
    const str = String(value ?? '');
    setSlots((prev) =>
      str.split('').map((ch, i) => {
        const prevChar = prev[i]?.char ?? ch;
        const prevKey  = prev[i]?.animKey ?? 0;
        const isDigit  = /\d/.test(ch);
        const changed  = isDigit && /\d/.test(prevChar) && ch !== prevChar;
        const dir = changed
          ? (parseInt(ch) > parseInt(prevChar) ? 'up' : 'down')
          : (prev[i]?.dir ?? 'up');
        return {
          char: ch,
          prevChar,
          animKey: changed ? prevKey + 1 : prevKey,
          dir,
        };
      })
    );
  }, [value]);

  return (
    <span className={className}>
      {slots.map((slot, i) => {
        const isDigit   = /\d/.test(slot.char);
        const animating = isDigit && slot.char !== slot.prevChar;

        if (!isDigit) {
          return <span key={i}>{slot.char}</span>;
        }

        return (
          <span
            key={i}
            style={{ display: 'inline-block', height: '1em', overflow: 'hidden', verticalAlign: 'top', lineHeight: '1' }}
          >
            {animating ? (
              <span key={slot.animKey} className={slot.dir === 'up' ? 'anim-slot-up' : 'anim-slot-down'}>
                {slot.dir === 'up' ? (
                  <>
                    <span style={{ display: 'block', lineHeight: '1' }}>{slot.prevChar}</span>
                    <span style={{ display: 'block', lineHeight: '1' }}>{slot.char}</span>
                  </>
                ) : (
                  <>
                    <span style={{ display: 'block', lineHeight: '1' }}>{slot.char}</span>
                    <span style={{ display: 'block', lineHeight: '1' }}>{slot.prevChar}</span>
                  </>
                )}
              </span>
            ) : (
              <span style={{ display: 'block', lineHeight: '1' }}>{slot.char}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}
