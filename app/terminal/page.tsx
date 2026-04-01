import TradingApp from '@/components/TradingApp';

// Prevent static prerendering — page requires runtime env vars (NEXT_PUBLIC_POLY_BUILDER_*)
export const dynamic = 'force-dynamic';

export default function Page() {
  return <TradingApp />;
}
