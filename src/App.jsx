import { useEffect, useMemo, useRef, useState } from 'react';
import { Side, OrderType } from '@polymarket/clob-client';

import { useWallet }         from './hooks/useWallet';
import { useMarket }         from './hooks/useMarket';
import { useWebSocket }      from './hooks/useWebSocket';
import { useBtcPrice }       from './hooks/useBtcPrice';
import { useCountdown }      from './hooks/useCountdown';
import { useTriggerEngine }  from './hooks/useTriggerEngine';
import { useStrikePrice }    from './hooks/useStrikePrice';
import { useMarketHistory }  from './hooks/useMarketHistory';

import { Toast }            from './components/Toast';
import { Header }           from './components/Header';
import { TradingViewChart } from './components/TradingViewChart';
import { PositionsTable }   from './components/PositionsTable';
import { MarketInfo }       from './components/MarketInfo';
import { OrderEntry }       from './components/OrderEntry';
import { OrderBook }        from './components/OrderBook';

// ── Toast helper (owned here so all hooks can receive it as a callback) ──────

function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };
  return { toast, showToast };
}

// ── Root component ────────────────────────────────────────────────────────────

function App() {
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

  const chainlinkPrice = useBtcPrice();
  const { countdown, countdownDisplay, countdownColor } = useCountdown(marketEndDate);

  const strikePrice = useStrikePrice();
  const marketHistory = useMarketHistory();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  // Y → arm YES, N → arm NO, Enter → confirm, Escape → disarm
  // C → close latest open position, 1-4 → set size %

  const [pendingSide, setPendingSide] = useState(null); // 'yes' | 'no' | null

  // Use a ref so the stable listener always has fresh values (assignment deferred below)
  const kbStateRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      // Don't intercept while user is typing in an input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const s = kbStateRef.current;
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
          // Close the most recently opened position
          const target = s.positions.length > 0 ? s.positions[s.positions.length - 1] : null;
          if (target) s.closePosition(target);
          break;
        }
        case '1': s.setSizePct(25);  break;
        case '2': s.setSizePct(50);  break;
        case '3': s.setSizePct(75);  break;
        case '4': s.setSizePct(100); break;
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
  }, [countdown, marketEndDate]);

  useWebSocket({ market, setMarket });

  // ── Order state ─────────────────────────────────────────────────────────────

  const [sizePct, setSizePct]       = useState(50);
  const [orderType, setOrderType]   = useState('market');
  const [positions, setPositions]   = useState([]);
  const [buyYesLoading, setBuyYesLoading] = useState(false);
  const [buyNoLoading, setBuyNoLoading]   = useState(false);
  const [closingPositionId, setClosingPositionId] = useState(null);
  const [stopLoss, setStopLoss]     = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const positionsRef = useRef([]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);

  useTriggerEngine({ market, positionsRef, setPositions, clobClient, countdown });

  // ── Derived values ───────────────────────────────────────────────────────────

  const walletBalanceUSDC = walletBalance != null ? parseFloat(walletBalance) : 0;
  const amountValue = useMemo(() => ((walletBalanceUSDC * sizePct) / 100).toFixed(2), [walletBalanceUSDC, sizePct]);
  const feeEstimate = useMemo(() => ((walletBalanceUSDC * sizePct) / 100 * 0.002).toFixed(2), [walletBalanceUSDC, sizePct]);
  const totalCost   = useMemo(() => (parseFloat(amountValue) + parseFloat(feeEstimate)).toFixed(2), [amountValue, feeEstimate]);
  const upPayout    = useMemo(() => {
    const p = market ? parseFloat(market.yesPrice) : 0.62;
    return p > 0 ? (parseFloat(amountValue) / p).toFixed(2) : '—';
  }, [amountValue, market]);
  const downPayout  = useMemo(() => {
    const p = market ? parseFloat(market.noPrice) : 0.38;
    return p > 0 ? (parseFloat(amountValue) / p).toFixed(2) : '—';
  }, [amountValue, market]);

  const buyDisabled = !walletAddress || !market || geoBlocked || buyYesLoading || buyNoLoading || wrongNetwork;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const placeOrder = async (side, tokenId) => {
    if (!clobClient) { showToast('error', 'Connect wallet first.'); return; }
    if (!market)     { showToast('error', 'Load a market first.'); return; }
    if (geoBlocked)  { showToast('error', 'Trading blocked in your region.'); return; }
    const price = parseFloat(tokenId === market.yesTokenId ? market.yesPrice : market.noPrice);
    const size  = parseFloat(amountValue);
    if (size < 1) { showToast('error', 'Min order size is $1.'); return; }
    const res = await clobClient.createAndPostOrder(
      { tokenID: tokenId, price, size, side },
      { tickSize: String(market.tickSize) },
      OrderType.GTC,
    );
    if (res?.errorMsg) throw new Error(res.errorMsg);
    setPositions((prev) => [...prev, {
      id:          res.orderID ?? crypto.randomUUID(),
      side:        tokenId === market.yesTokenId ? 'YES' : 'NO',
      size:        size,
      entry:       price,
      tokenId:     tokenId,
      stopLoss:    stopLoss   ? parseFloat(stopLoss)   : undefined,
      takeProfit:  takeProfit ? parseFloat(takeProfit) : undefined,
      status:      'OPEN_POSITION',
      orderId:     res.orderID,
    }]);
    showToast('success', `Order placed: ${res.orderID ?? 'n/a'}`);
  };

  const buyYes = async () => {
    setBuyYesLoading(true);
    try { await placeOrder(Side.BUY, market.yesTokenId); }
    catch (err) { showToast('error', `Order failed: ${err.message}`); }
    finally { setBuyYesLoading(false); }
  };

  const buyNo = async () => {
    setBuyNoLoading(true);
    try { await placeOrder(Side.BUY, market.noTokenId); }
    catch (err) { showToast('error', `Order failed: ${err.message}`); }
    finally { setBuyNoLoading(false); }
  };

  const closePosition = async (position) => {
    if (!clobClient) { showToast('error', 'Connect wallet first.'); return; }
    setClosingPositionId(position.id);
    try {
      if (position.orderId) {
        try {
          await clobClient.cancelOrder({ orderID: position.orderId });
        } catch {
          // Already filled — place a sell order instead
          const tokenId = position.side === 'YES' ? market.yesTokenId : market.noTokenId;
          const size  = position.size;
          const price = parseFloat(position.currentPrice);
          await clobClient.createAndPostOrder(
            { tokenID: tokenId, price, size, side: Side.SELL },
            { tickSize: String(market.tickSize) },
            OrderType.GTC,
          );
        }
      }
      setPositions((prev) => prev.filter((p) => p.id !== position.id));
      showToast('success', 'Position closed.');
    } catch (err) {
      showToast('error', `Close failed: ${err.message}`);
    } finally {
      setClosingPositionId(null);
    }
  };

  // Keep the keyboard handler ref fresh with current values every render
  kbStateRef.current = { buyDisabled, buyYes, buyNo, positions, closePosition, setSizePct, pendingSide, setPendingSide };

  // ── Layout ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen overflow-hidden bg-[#0d0e11] text-[#e8e8e8]">
      <Toast toast={toast} />

      <Header
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        wrongNetwork={wrongNetwork}
        btcPrice={chainlinkPrice}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}

      />

      <main className="pt-11">
        <div className="h-[calc(100vh-44px)] flex flex-col min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,70%)_minmax(400px,30%)]">

          {/* Chart + positions (left col desktop / top on mobile) */}
          <section className="h-[45%] shrink-0 flex flex-col min-[1100px]:h-full">
            <div className="flex-1 min-h-0">
              <TradingViewChart targetPrice={strikePrice ?? 64500} />
            </div>


            {/* Positions — desktop only */}
            <div className="hidden min-[1100px]:block h-[22%] shrink-0 overflow-y-auto border-t border-[#22242a] bg-[#131518]">
              <PositionsTable
                positions={positions}
                market={market}
                closingPositionId={closingPositionId}
                closePosition={closePosition}
              />
            </div>
          </section>

          {/* Trade panel (right col desktop / scrollable bottom on mobile) */}
          <aside
            className="flex-1 min-h-0 overflow-y-auto border-t border-[#22242a] bg-[#131518] min-[1100px]:h-full min-[1100px]:flex-none min-[1100px]:border-t-0 min-[1100px]:border-l min-[1100px]:border-[#22242a]"
          >
            <MarketInfo
              market={market}
              marketLoading={marketLoading}
              marketError={marketError}
              countdown={countdown}
              countdownDisplay={countdownDisplay}
              countdownColor={countdownColor}
              marketStrikePrice={strikePrice}
              btcPrice={chainlinkPrice}
              autoLoadMarket={autoLoadMarket}
              recentResults={marketHistory}
            />

            <OrderEntry
              sizePct={sizePct}
              setSizePct={setSizePct}
              orderType={orderType}
              setOrderType={setOrderType}
              amountValue={amountValue}
              feeEstimate={feeEstimate}
              totalCost={totalCost}
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

            <OrderBook market={market} />
          </aside>

        </div>
      </main>
    </div>
  );
}

export default App;
