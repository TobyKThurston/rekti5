import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const CHAINLINK_PROXY   = '0xc907E116054Ad103354f2D350FD2514433D57F6f';
const WSS_URL           = 'wss://polygon-bor-rpc.publicnode.com';
const PROXY_ABI         = [
  'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
  'function aggregator() view returns (address)',
];
const AGGREGATOR_ABI    = [
  'event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt)',
];

// HTTP provider reused for initial fetch + fallback polls
const httpProvider = new ethers.providers.JsonRpcProvider('/polygon-rpc');
const proxyContract = new ethers.Contract(CHAINLINK_PROXY, PROXY_ABI, httpProvider);

export function useBtcPrice() {
  const [chainlinkPrice, setChainlinkPrice] = useState(null);

  useEffect(() => {
    let wsProvider, aggregatorContract, fallbackId, reconnectTimer;
    let destroyed = false;

    async function setup() {
      // 1. Immediate price on mount
      try {
        const [, answer] = await proxyContract.latestRoundData();
        if (!destroyed) setChainlinkPrice(answer.toNumber() / 1e8);
      } catch (e) {
        console.error('[chainlink] initial fetch error:', e);
      }

      // 2. WebSocket provider
      wsProvider = new ethers.providers.WebSocketProvider(WSS_URL);

      // 3. Get aggregator address and subscribe
      const aggregatorAddress = await proxyContract.aggregator();
      if (destroyed) return;

      aggregatorContract = new ethers.Contract(aggregatorAddress, AGGREGATOR_ABI, wsProvider);
      aggregatorContract.on('AnswerUpdated', (current) => {
        setChainlinkPrice(current.toNumber() / 1e8);
      });

      // 4. Reconnect on WS close
      wsProvider._websocket.on('close', () => {
        if (destroyed) return;
        console.warn('[chainlink] WS closed, reconnecting in 2s…');
        wsProvider.removeAllListeners?.();
        aggregatorContract?.removeAllListeners();
        reconnectTimer = setTimeout(setup, 2000);
      });

      // 5. 30s fallback poll
      clearInterval(fallbackId);
      fallbackId = setInterval(async () => {
        try {
          const [, answer] = await proxyContract.latestRoundData();
          if (!destroyed) setChainlinkPrice(answer.toNumber() / 1e8);
        } catch (e) {
          console.error('[chainlink] fallback poll error:', e);
        }
      }, 30_000);
    }

    setup().catch(e => console.error('[chainlink] setup error:', e));

    return () => {
      destroyed = true;
      clearInterval(fallbackId);
      clearTimeout(reconnectTimer);
      aggregatorContract?.removeAllListeners();
      wsProvider?.destroy();
    };
  }, []);

  return chainlinkPrice;
}
