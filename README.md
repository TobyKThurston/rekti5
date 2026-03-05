# Rekti5

A low-latency trading cockpit for Polymarket's BTC 5-minute binary prediction markets. Built for speed — keyboard-driven order entry, sub-100ms order book updates, and automatic stop-loss/take-profit execution.

---

## What it does

Rekti5 lets you trade YES/NO outcomes on whether Bitcoin's price will be higher or lower at the close of each 5-minute window. It connects directly to Polymarket's Central Limit Order Book (CLOB) for real-time market data and order execution, cross-references Chainlink and Kraken for the opening "Price to Beat", and runs an automated trigger engine that fires SL/TP orders without you touching the keyboard.

---

## Features

- **Real-time order book** — WebSocket feed from Polymarket CLOB with bid/ask spreads updating sub-100ms
- **Live BTC/USD oracle** — Kraken WebSocket ticker with automatic reconnection
- **Price to Beat** — Multi-source resolution: Polymarket resolved data → Chainlink on-chain round walkback → SQLite cache, so the correct opening price is always shown instantly on page load
- **Automated SL/TP** — OCO (One-Cancels-Other) trigger engine with atomic execution guards preventing double-fires
- **Keyboard trading** — `Y` arm YES · `N` arm NO · `Enter` confirm · `Esc` cancel · `C` close position · `1–4` preset sizes
- **Position tracker** — Open positions with live P&L, status badges, and one-click close
- **Market history** — Last 5 resolved windows with outcomes cached in localStorage
- **TradingView chart** — Embedded 1-minute BTC/USD candles with price-to-beat overlay line
- **Silent reconnection** — API credentials cached in localStorage; no MetaMask popup on reload

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| Web3 | Ethers.js v5, MetaMask, Polygon mainnet |
| Order execution | @polymarket/clob-client |
| Backend | Node.js, WebSocket (ws), node-cron |
| Persistence | better-sqlite3 |
| Oracle | Chainlink BTC/USD on Polygon · Kraken WS |
| Deployment | Vercel (frontend) + local Node server |

---

## Getting started

**Prerequisites:** Node.js 18+, MetaMask with Polygon mainnet configured and USDC balance

```bash
npm install
npm run dev
```

This starts the Node backend (port 3001) and Vite dev server concurrently. Open the Vite URL in your browser, connect your wallet, and the app auto-loads the current BTC 5m market.

On startup the backend immediately fetches and stores the current window's Chainlink price — you'll see `[chainlink] stored <price>` in the terminal.

---

## How the Price to Beat works

Each 5-minute window has a "Price to Beat" — the BTC/USD price at the exact moment the window opened. Rekti5 resolves this from three sources in order:

1. **Polymarket** — once a window resolves, the exact price is available via their event API
2. **Chainlink** — for the live window, walks back oracle round IDs on Polygon to find the round active at `windowStartMs`
3. **SQLite cache** — the backend stores each window's price on a cron schedule, so page reloads show the value instantly without any RPC delay

---

## Architecture

```
Browser (React)
  ├── WebSocket ──────────────────→ Node backend (3001)
  │                                    ├── WebSocket → Polymarket CLOB feed
  │                                    ├── Cron (*/5 min) → Chainlink on Polygon
  │                                    └── SQLite (resolution_prices.db)
  ├── HTTP /price-to-beat ────────→ Node backend
  ├── WebSocket → Kraken (BTC/USD)
  ├── REST → Polymarket Gamma API
  └── REST → Polymarket CLOB API
```

The Node backend is local-only — Vercel deploys only the static frontend. When `/price-to-beat` returns 404 (Vercel), the hook falls back transparently to the Chainlink RPC path.

---

## Key files

```
server/index.js              Node backend — WS proxy, Chainlink cron, HTTP endpoint
src/hooks/useStrikePrice.js  Price-to-beat resolution (server → Polymarket → Chainlink)
src/hooks/useTriggerEngine.js  Automated SL/TP execution loop
src/hooks/useWebSocket.js    Polymarket CLOB subscription + order book state
src/hooks/useBtcPrice.js     Kraken live BTC/USD feed
src/components/OrderEntry.jsx  Trade UI, keyboard state, order submission
src/components/PositionsTable.jsx  Open positions + P&L
vite.config.js               Dev proxies for all external APIs
vercel.json                  Production rewrites
```

---

## Environment

No `.env` file needed. The app uses MetaMask for signing — connect your wallet and your CLOB API key is derived on-chain. All external API calls are proxied through Vite (dev) or Vercel rewrites (prod) to avoid CORS.
