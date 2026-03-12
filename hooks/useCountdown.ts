import { useEffect, useState } from 'react';

export function useCountdown(marketEndDate: string | null | undefined) {
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    if (!marketEndDate) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(marketEndDate).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [marketEndDate]);

  const countdownDisplay = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
  const countdownColor = countdown > 120 ? '#27c47c' : countdown > 60 ? '#f09000' : '#e04f4f';

  return { countdown, countdownDisplay, countdownColor };
}
