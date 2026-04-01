export const runtime = 'nodejs';

export async function GET() {
  const res = await fetch(
    'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1',
    { cache: 'no-store' },
  );

  if (!res.ok) {
    return new Response('Kraken fetch failed', { status: 502 });
  }

  const json = await res.json();

  if (json.error?.length) {
    return new Response(JSON.stringify({ error: json.error }), { status: 502 });
  }

  // Kraken returns results keyed by pair name (e.g. "XXBTZUSD")
  const pairKey = Object.keys(json.result).find((k) => k !== 'last');
  if (!pairKey) {
    return new Response('No pair data', { status: 502 });
  }

  // Each entry: [time, open, high, low, close, vwap, volume, count]
  const raw: [number, string, string, string, string, ...unknown[]][] = json.result[pairKey];

  const candles = raw
    .map((entry) => ({
      time: entry[0],
      open: +entry[1],
      high: +entry[2],
      low: +entry[3],
      close: +entry[4],
    }))
    .slice(-720); // cap at 720; Kraken already returns ascending

  return Response.json(candles);
}
