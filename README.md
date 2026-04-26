# Rekti5

**A keyboard-driven trading terminal for Polymarket's BTC 5-minute prediction markets.** Streams live CLOB order books, reconciles the strike price across three independent sources, and runs an automated trigger engine that fires exactly once inside a 5-minute window.

Built with Next.js 14, TypeScript, and a standalone Node service for the long-lived WebSocket and on-chain price feed.

---

## Why this project

Every 5 minutes, Polymarket opens a new binary market on whether Bitcoin will close above or below the window's opening price. The trade window is short, the data is noisy, and a general-purpose prediction-market UI is too slow and too cluttered to use here. Rekti5 is the purpose-built cockpit: one keystroke to arm a side, one to fire, automated exits, no mouse.

The interesting engineering is in three places — getting price data in fast, reconciling the "price-to-beat" across sources that don't always agree, and making sure stop-loss / take-profit triggers fire exactly once inside a tight window.

---

## Engineering highlights

- **Three-source strike-price resolution with graceful fallback.** Polymarket's resolved data is source of truth for closed windows; for the active window, the app walks back round IDs on Polygon's Chainlink BTC/USD feed to find the round live at `windowStartMs`; a SQLite snapshot provides a fast cached read. The frontend degrades automatically to Chainlink when the cache is unavailable (e.g. on Vercel).
- **Concurrency-safe trigger engine.** Stop-loss and take-profit checks run on every price tick. A guard prevents a tick arriving mid-submission from re-firing an exit — a single position closes exactly once.
- **Sub-100ms order path.** Direct CLOB WebSocket subscription, wallet-signed orders, REST submission. Builder credentials live server-side and are never shipped to the client.
- **Resilient WebSocket layer** for both Polymarket and Kraken — exponential backoff, last-tick replay, and silent recovery so the chart never gaps on a network blip.
- **Standalone backend by design.** The long-lived WebSocket proxy and Chainlink cron live in a separate Node process (`server/index.ts`). Folding them into a Next API route would lose the persistent socket and the schedule.
- **Pinned dependency, deliberate.** Ethers stays at v5 to preserve full type compatibility with `@polymarket/clob-client` — chose stability over a v6 migration.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| Web3 | Ethers v5, MetaMask, Polygon mainnet |
| Order execution | `@polymarket/clob-client`, server-side builder signing |
| Backend service | Node.js + `ws` (standalone process, port 3001) |
| Persistence | `better-sqlite3` |
| Oracles | Chainlink BTC/USD (Polygon) + Kraken WebSocket |
| Observability | Sentry, Vercel Analytics, Pino |
| Testing | Vitest, React Testing Library |
| Hosting | Vercel (Next.js) + self-hosted backend |

---

## Architecture

```
Browser (Next.js / React)
  │
  ├── WebSocket  →  Node backend (:3001)
  │                   ├── WS  → Polymarket CLOB (proxy)
  │                   ├── Cron → Chainlink on Polygon
  │                   └── SQLite (resolution_prices.db)
  │
  ├── HTTP /api/price-to-beat  →  Next route (SQLite read, 404 in prod)
  ├── WebSocket  →  Kraken (BTC/USD)
  ├── REST       →  Polymarket Gamma
  └── REST       →  Polymarket CLOB (orders)
```

Order signing happens client-side via `@polymarket/clob-client`. Builder credentials stay on the server and are never shipped to the browser.

---

## Strike-price resolution

Each window's opening price is resolved in this order:

1. **Polymarket.** Once a window resolves, the exact opening price is exposed via the event API — source of truth for any completed window.
2. **Chainlink.** For the live window, the app walks back round IDs on Polygon's BTC/USD feed to find the round active at `windowStartMs`.
3. **SQLite cache.** The backend snapshots each window's price on a cron, so reloads show the correct value without an RPC round-trip.

On Vercel (where the SQLite file is not available), the cache lookup returns 404 and the frontend falls back to Chainlink automatically.

---

## Features

- Real-time order book streamed from Polymarket's CLOB WebSocket
- Live BTC/USD feed from Kraken with automatic reconnection
- Automated stop-loss and take-profit with concurrency guards
- Keyboard-first: `Y` / `N` to arm a side, `Enter` to confirm, `Esc` to cancel, `C` to close, `1`–`4` for preset sizes
- Open positions tracker with live P&L and one-click close
- Last 5 resolved windows cached in `localStorage`
- Embedded TradingView chart with a strike-price overlay line

---

## Run locally

Requires Node.js 18+, MetaMask on Polygon mainnet, and some USDC.

```bash
npm install
npm run dev
```

Runs the Next.js dev server and the standalone backend concurrently. The backend listens on port 3001 and handles the Polymarket WebSocket proxy and SQLite reads. Connect a wallet and the current 5-minute market loads automatically.

```bash
npm run type-check   # tsc --noEmit
npm test             # vitest
npm run build        # production bundle
```

---

## Environment

No `.env` is required for local development — the CLOB API key is derived from the connected wallet. Production sets `POLYMARKET_BUILDER_ADDRESS` and `POLYMARKET_BUILDER_PRIVATE_KEY` server-side for builder-attributed orders.

---

## Key files

```
app/page.tsx                      Landing page
app/terminal/page.tsx             Trading terminal entry → <TradingApp />
app/api/place-order/route.ts      Server-side order submission (keeps builder creds off the client)
app/api/price-to-beat/route.ts    SQLite read for cached window prices
components/TradingApp.tsx         Top-level UI shell
components/OrderEntry.tsx         Trade panel, keyboard handlers, order submission
components/PositionsTable.tsx     Open positions, live P&L
hooks/useWebSocket.ts             Polymarket order book subscription
hooks/useStrikePrice.ts           Strike-price resolution chain
hooks/useTriggerEngine.ts         Automated SL/TP loop
hooks/useBtcPrice.ts              Kraken BTC/USD stream
server/index.ts                   Standalone Node service (WS proxy + cron)
```

---

## Design notes

- The backend is a separate process by design. Folding it into a Next API route would lose the persistent WebSocket and the cron schedule.
- `next.config.mjs` (not `.ts`) because Next.js 14 does not support a TypeScript config file.
- Ethers pinned at v5 for `@polymarket/clob-client` type compatibility.

---

Built by [Toby Thurston](https://github.com/TobyKThurston).
