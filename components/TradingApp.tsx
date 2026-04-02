'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Side, OrderType } from '@polymarket/clob-client';

import { useWallet }         from '@/hooks/useWallet';
import { useMarket }         from '@/hooks/useMarket';
import { useWebSocket }      from '@/hooks/useWebSocket';
import { useCountdown }      from '@/hooks/useCountdown';
import { useTriggerEngine }  from '@/hooks/useTriggerEngine';
import { useStrikePrice }    from '@/hooks/useStrikePrice';
import { useMarketHistory }  from '@/hooks/useMarketHistory';

import { ErrorBoundary }    from '@/components/ErrorBoundary';
import { Toast }            from '@/components/Toast';
import { Header }           from '@/components/Header';
import { TradingViewChart } from '@/components/TradingViewChart';
import { PositionsTable }        from '@/components/PositionsTable';
import { MarketInfo }            from '@/components/MarketInfo';
import { OrderEntry }            from '@/components/OrderEntry';
import { MarketMicrostructure }  from '@/components/MarketMicrostructure';
import { SignalStack }           from '@/components/SignalStack';

import type { Position, ToastState } from '@/types';

// ── Toast helper ──────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (type: ToastState['type'], msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };
  return { toast, showToast };
}

// ── Keyboard state ref shape ──────────────────────────────────────────────────

interface KbState {
  buyDisabled: boolean;
  buyYes: () => void;
  buyNo: () => void;
  positions: Position[];
  closePosition: (p: Position) => void;
  setSizePct: (v: number) => void;
  walletBalanceUSDC: number;
  pendingSide: 'yes' | 'no' | null;
  setPendingSide: (v: 'yes' | 'no' | null) => void;
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function TradingApp() {
  const { toast, showToast } = useToast();

  const {
    walletAddress, walletBalance,
    clobClient,
    geoBlocked,
    wrongNetwork,
    connectWallet, disconnectWallet,
  } = useWallet(showToast);

  const {
    market, setMarket,
    marketLoading, marketError,
    marketEndDate,
    autoLoadMarket,
  } = useMarket(showToast);

  const { countdown, countdownDisplay, countdownColor } = useCountdown(marketEndDate);

  const strikePrice = useStrikePrice();
  const marketHistory = useMarketHistory(market?.yesTokenId);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  const [chartMounted, setChartMounted] = useState(false);
  const [pendingSide, setPendingSide] = useState<'yes' | 'no' | null>(null);
  const kbStateRef = useRef<KbState | null>(null);

  useEffect(() => setChartMounted(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const s = kbStateRef.current;
      if (!s) return;
      switch (e.key) {
        case 'y': case 'Y':
          if (!s.buyDisabled) s.setPendingSide('yes');
          break;
        case 'n': case 'N':
          if (!s.buyDisabled) s.setPendingSide('no');
          break;
        case 'Enter':
          if (s.pendingSide === 'yes' && !s.buyDisabled) { s.buyYes(); s.setPendingSide(null); }
          else if (s.pendingSide === 'no'  && !s.buyDisabled) { s.buyNo();  s.setPendingSide(null); }
          break;
        case 'Escape':
          s.setPendingSide(null);
          break;
        case 'c': case 'C': {
          const target = s.positions.length > 0 ? s.positions[s.positions.length - 1] : null;
          if (target) s.closePosition(target);
          break;
        }
        case '1': s.setSizePct(s.walletBalanceUSDC > 0 ? Math.min(100, (1  / s.walletBalanceUSDC) * 100) : 0); break;
        case '2': s.setSizePct(s.walletBalanceUSDC > 0 ? Math.min(100, (5  / s.walletBalanceUSDC) * 100) : 0); break;
        case '3': s.setSizePct(s.walletBalanceUSDC > 0 ? Math.min(100, (10 / s.walletBalanceUSDC) * 100) : 0); break;
        case '4': s.setSizePct(s.walletBalanceUSDC > 0 ? Math.min(100, (25 / s.walletBalanceUSDC) * 100) : 0); break;
        case '5': s.setSizePct(s.walletBalanceUSDC > 0 ? Math.min(100, (50 / s.walletBalanceUSDC) * 100) : 0); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Auto-reload market at countdown zero
  useEffect(() => {
    if (countdown === 0 && marketEndDate) {
      const t = setTimeout(autoLoadMarket, 4000);
      return () => clearTimeout(t);
    }
  }, [countdown, marketEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const { recentTrades, whaleTrades } = useWebSocket({ market, setMarket });

  // ── Order state ──────────────────────────────────────────────────────────────

  const [sizePct, setSizePct]       = useState(50);
  const [positions, setPositions]   = useState<Position[]>([]);
  const [buyYesLoading, setBuyYesLoading] = useState(false);
  const [buyNoLoading, setBuyNoLoading]   = useState(false);
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null);
  const [stopLoss, setStopLoss]     = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const positionsRef = useRef<Position[]>([]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);

  useTriggerEngine({ market, positionsRef, setPositions, clobClient, countdown, showToast });

  // ── Derived values ────────────────────────────────────────────────────────────

  const walletBalanceUSDC = walletBalance != null ? parseFloat(walletBalance) : 0;
  const amountValue = useMemo(() => ((walletBalanceUSDC * sizePct) / 100).toFixed(2), [walletBalanceUSDC, sizePct]);
  const feeEstimate = useMemo(() => ((walletBalanceUSDC * sizePct) / 100 * 0.002).toFixed(2), [walletBalanceUSDC, sizePct]);
  const upPayout    = useMemo(() => {
    const p = market ? parseFloat(market.yesPrice) : 0.62;
    return p > 0 ? (parseFloat(amountValue) / p).toFixed(2) : '—';
  }, [amountValue, market]);
  const downPayout  = useMemo(() => {
    const p = market ? parseFloat(market.noPrice) : 0.38;
    return p > 0 ? (parseFloat(amountValue) / p).toFixed(2) : '—';
  }, [amountValue, market]);

  const buyDisabled = !walletAddress || !market || geoBlocked || buyYesLoading || buyNoLoading || wrongNetwork;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const placeOrder = async (side: typeof Side.BUY, tokenId: string) => {
    if (!clobClient) { showToast('error', 'Connect wallet first.'); return; }
    if (!market)     { showToast('error', 'Load a market first.'); return; }
    if (geoBlocked)  { showToast('error', 'Trading blocked in your region.'); return; }
    const price = parseFloat(tokenId === market.yesTokenId ? market.yesPrice : market.noPrice);
    const size  = parseFloat(amountValue);
    if (size < 1) { showToast('error', 'Min order size is $1.'); return; }
    const signedOrder = await clobClient.createOrder(
      { tokenID: tokenId, price, size, side },
      { tickSize: String(market.tickSize) },
    );
    const apiCreds = JSON.parse(sessionStorage.getItem('clobApiCreds') ?? '{}');
    const res = await fetch('/api/place-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedOrder, orderType: OrderType.GTC, apiCreds }),
    });
    const data = await res.json();
    if (!res.ok || data?.errorMsg) throw new Error(data?.errorMsg ?? 'Order failed');
    setPositions((prev) => [...prev, {
      id:          data.orderID ?? crypto.randomUUID(),
      side:        tokenId === market.yesTokenId ? 'YES' : 'NO',
      size,
      entry:       price,
      tokenId,
      stopLoss:    stopLoss   ? parseFloat(stopLoss)   : undefined,
      takeProfit:  takeProfit ? parseFloat(takeProfit) : undefined,
      status:      'OPEN_POSITION',
      orderId:     data.orderID,
    }]);
    showToast('success', `Order placed: ${data.orderID ?? 'n/a'}`);
  };

  const buyYes = async () => {
    if (!market) return;
    setBuyYesLoading(true);
    try { await placeOrder(Side.BUY, market.yesTokenId); }
    catch (err) { showToast('error', `Order failed: ${(err as Error).message}`); }
    finally { setBuyYesLoading(false); }
  };

  const buyNo = async () => {
    if (!market) return;
    setBuyNoLoading(true);
    try { await placeOrder(Side.BUY, market.noTokenId); }
    catch (err) { showToast('error', `Order failed: ${(err as Error).message}`); }
    finally { setBuyNoLoading(false); }
  };

  const closePosition = async (position: Position) => {
    if (!clobClient) { showToast('error', 'Connect wallet first.'); return; }
    setClosingPositionId(position.id);
    try {
      if (position.orderId) {
        try {
          await clobClient.cancelOrder({ orderID: position.orderId });
        } catch {
          const tokenId = position.side === 'YES' ? market!.yesTokenId : market!.noTokenId;
          const size  = position.size;
          const price = position.side === 'YES'
            ? parseFloat(String(market!.bestBid))
            : parseFloat(String(market!.bestNoBid ?? market!.bestBid));
          const signedOrder = await clobClient.createOrder(
            { tokenID: tokenId, price, size, side: Side.SELL },
            { tickSize: String(market!.tickSize) },
          );
          const apiCreds = JSON.parse(sessionStorage.getItem('clobApiCreds') ?? '{}');
          const res = await fetch('/api/place-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedOrder, orderType: OrderType.GTC, apiCreds }),
          });
          const data = await res.json();
          if (!res.ok || data?.errorMsg) throw new Error(data?.errorMsg ?? 'Close order failed');
        }
      }
      setPositions((prev) => prev.filter((p) => p.id !== position.id));
      showToast('success', 'Position closed.');
    } catch (err) {
      showToast('error', `Close failed: ${(err as Error).message}`);
    } finally {
      setClosingPositionId(null);
    }
  };

  kbStateRef.current = { buyDisabled, buyYes, buyNo, positions, closePosition, setSizePct, walletBalanceUSDC, pendingSide, setPendingSide };

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <div className="h-screen overflow-hidden bg-[#0d0e11] text-[#e8e8e8]">
      <Toast toast={toast} />

      <Header
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        wrongNetwork={wrongNetwork}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
      />

      <main className="pt-11">
        <div className="h-[calc(100vh-44px)] flex flex-col min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,70%)_minmax(400px,30%)]">

          <section className="h-[45%] shrink-0 flex flex-col min-[1100px]:h-full">

            {/* Chart + signal stack + empty gap */}
            <div className="flex-1 min-h-0 flex bg-[#0d0e11]">
              {/* Chart column */}
              <div className="flex flex-col flex-1 min-w-0 h-full">
                <div className="flex-1 min-h-0">
                  {chartMounted
                    ? <TradingViewChart targetPrice={strikePrice ?? 64500} />
                    : <div className="h-full w-full bg-[#0d0e11]" />}
                </div>
                <div className="shrink-0 h-[26%] flex border-t border-[#22242a] bg-[#131518]">
                  <MarketMicrostructure
                    market={market}
                    recentTrades={recentTrades}
                    amountValue={amountValue}
                  />
                </div>
              </div>

              {/* Signal Stack */}
              <div className="w-[160px] shrink-0 h-full border-l border-[#22242a] bg-[#131518] overflow-y-auto">
                <SignalStack strikePrice={strikePrice} recentResults={marketHistory} whaleTrades={whaleTrades} />
              </div>
            </div>

            {/* Positions */}
            <div className="hidden min-[1100px]:block h-[22%] shrink-0 overflow-y-auto border-t border-[#22242a] bg-[#131518]">
              <PositionsTable
                positions={positions}
                market={market}
                closingPositionId={closingPositionId}
                closePosition={closePosition}
              />
            </div>
          </section>

          <aside
            className="flex-1 min-h-0 overflow-y-auto border-t border-[#22242a] bg-[#131518] min-[1100px]:h-full min-[1100px]:flex-none min-[1100px]:border-t-0 min-[1100px]:border-l min-[1100px]:border-[#22242a]"
          >
            <MarketInfo
              market={market}
              marketLoading={marketLoading}
              marketError={marketError}
              countdownDisplay={countdownDisplay}
              countdownColor={countdownColor}
              marketStrikePrice={strikePrice}
              autoLoadMarket={autoLoadMarket}
              recentResults={marketHistory}
            />

            <OrderEntry
              sizePct={sizePct}
              setSizePct={setSizePct}
              walletBalance={walletBalanceUSDC}
              amountValue={amountValue}
              feeEstimate={feeEstimate}
              upPayout={upPayout}
              downPayout={downPayout}
              buyYes={buyYes}
              buyNo={buyNo}
              buyYesLoading={buyYesLoading}
              buyNoLoading={buyNoLoading}
              buyDisabled={buyDisabled}
              geoBlocked={geoBlocked}
              stopLoss={stopLoss}
              setStopLoss={setStopLoss}
              takeProfit={takeProfit}
              setTakeProfit={setTakeProfit}
              pendingSide={pendingSide}
            />
          </aside>

        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
