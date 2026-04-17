# Rekti5

A keyboard-driven trading terminal for Polymarket's BTC 5-minute binary prediction markets. It connects directly to Polymarket's order book, streams live BTC prices, and runs an automated trigger engine for stop-loss and take-profit exits.

## What it does

Every 5 minutes, Polymarket opens a new binary market on whether Bitcoin will close higher or lower than its opening price. Rekti5 is a purpose-built UI for trading these markets. You connect a wallet, pick a side, and the app handles order signing, submission, and automated exits.

The core loop is built around three concerns: getting price data in as fast as possible, executing orders with minimal friction, and making sure triggers fire reliably inside a 5-minute window.

## Features

* Real-time order book streamed from Polymarket's CLOB WebSocket
* Live BTC/USD feed from Kraken with automatic reconnection
* Price-to-Beat resolution from three sources: Polymarket's resolved data, a Chainlink walkback on Polygon, and a local SQLite cache
* Automated stop-loss and take-profit with concurrency guards to prevent double-fires
* Keyboard shortcuts: `Y` / `N` to arm a side, `Enter` to confirm, `Esc` to cancel, `C` to close, `1`-`4` for preset sizes
* Open positions tracker with live P&L and one-click close
* Last 5 resolved windows cached in localStorage
* Embedded TradingView chart with a price-to-beat overlay line

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| Web3 | Ethers v5, MetaMask, Polygon mainnet |
| Order execution | `@polymarket/clob-client`, builder signing server-side |
| Backend service | Node.js + `ws` (standalone process on port 3001) |
| Persistence | `better-sqlite3` |
| Oracles | Chainlink BTC/USD (Polygon) + Kraken WebSocket |
| Hosting | Vercel (Next.js app) + self-hosted backend |

## Running locally

Requires Node.js 18+, a MetaMask wallet on Polygon mainnet, and some USDC.

```bash
npm install
npm run dev
```

This runs the Next.js dev server and the standalone backend concurrently via `concurrently`. The backend listens on port 3001 and handles the Polymarket WebSocket proxy and SQLite reads. Open the Next.js URL, connect your wallet, and the current 5-minute market loads automatically.

## Price-to-Beat resolution

Each window's opening price is resolved in this order:

1. **Polymarket.** Once a window resolves, the exact opening price is exposed via their event API. This is the source of truth for any completed window.
2. **Chainlink.** For the live window, the app walks back round IDs on Polygon's BTC/USD feed to find the round that was active at `windowStartMs`.
3. **SQLite cache.** The backend snapshots each window's price on a cron, so page reloads show the correct value without an RPC round-trip.

On Vercel (where the SQLite file is not available), the cache lookup returns 404 and the frontend falls back to Chainlink automatically.

## Architecture

```
Browser (Next.js / React)
  │
  ├── WebSocket  →  Node backend (:3001)
  │                   ├── WS → Polymarket CLOB
  │                   ├── Cron → Chainlink on Polygon
  │                   └── SQLite (resolution_prices.db)
  │
  ├── HTTP /api/price-to-beat  →  Next route (SQLite read, 404 in prod)
  ├── WebSocket  →  Kraken (BTC/USD)
  ├── REST       →  Polymarket Gamma
  └── REST       →  Polymarket CLOB (orders)
```

Order signing happens client-side via `@polymarket/clob-client`. Builder credentials stay on the server and are never shipped to the browser.

## Key files

```
app/page.tsx                      Entry point, renders <TradingApp />
app/api/place-order/route.ts      Server-side order submission (keeps builder creds off the client)
app/api/price-to-beat/route.ts    SQLite read for cached window prices
components/TradingApp.tsx         Top-level UI shell
components/OrderEntry.tsx         Trade panel, keyboard handlers, order submission
components/PositionsTable.tsx     Open positions, live P&L
hooks/useWebSocket.ts             Polymarket order book subscription
hooks/useStrikePrice.ts           Price-to-Beat resolution chain
hooks/useTriggerEngine.ts         Automated SL/TP loop
hooks/useBtcPrice.ts              Kraken BTC/USD stream
server/index.ts                   Standalone Node service (WS proxy + cron)
```

## Environment

No `.env` is required for local development. The CLOB API key is derived from the connected wallet. For production, the server uses `POLYMARKET_BUILDER_ADDRESS` and `POLYMARKET_BUILDER_PRIVATE_KEY` to sign builder-attributed orders.

## Notes

* Ethers is pinned at v5 for `@polymarket/clob-client` compatibility.
* `next.config.mjs` (not `.ts`) because Next.js 14 does not support a TypeScript config file.
* The backend is a separate process by design. Folding it into a Next API route would lose the persistent WebSocket and the cron.
