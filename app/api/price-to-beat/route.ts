import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // This endpoint is only available in local dev (no SQLite on Vercel)
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(null, { status: 404 });
  }

  try {
    // Lazy-require to avoid module errors in environments without better-sqlite3
    const Database = (await import('better-sqlite3')).default;
    const db = new Database('resolution_prices.db', { readonly: true });
    const row = db.prepare('SELECT * FROM resolution_prices ORDER BY window_start DESC LIMIT 1').get();
    db.close();
    return NextResponse.json(row ?? null);
  } catch (err) {
    console.error('[api/price-to-beat]', err);
    return NextResponse.json(null, { status: 500 });
  }
}
