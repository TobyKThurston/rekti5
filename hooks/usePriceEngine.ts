import { useEffect, useState } from 'react';
import { priceEngine } from '@/lib/priceEngine';

export function usePriceEngine(): number | null {
  const [price, setPrice] = useState<number | null>(priceEngine.getPrice());

  useEffect(() => {
    priceEngine.start();
    return priceEngine.subscribe(setPrice);
  }, []);

  return price;
}
