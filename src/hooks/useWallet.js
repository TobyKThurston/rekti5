import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';
import { MAINNET } from '../config/networks';

export function useWallet(showToast) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [clobClient, setClobClient]       = useState(null);
  const [geoBlocked, setGeoBlocked]       = useState(false);
  const [wrongNetwork, setWrongNetwork]   = useState(false);

  const checkGeo = async () => {
    try {
      const res = await fetch('https://polymarket.com/api/geoblock');
      if (!res.ok) return;
      const data = await res.json();
      setGeoBlocked(data.blocked === true);
    } catch { /* silently ignore — don't block trading on network error */ }
  };

  const clearWalletState = () => {
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('clobApiCreds');
    setWalletAddress(null);
    setWalletBalance(null);
    setClobClient(null);
    setGeoBlocked(false);
  };

  const connectWallet = async () => {
    if (!window.ethereum) { showToast('error', 'MetaMask not found.'); return; }
    const net = MAINNET;
    setWrongNetwork(false);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== net.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: net.chainHex }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId:           net.chainHex,
                chainName:         net.chainName,
                rpcUrls:           [net.rpcUrl],
                nativeCurrency:    net.nativeCurrency,
                blockExplorerUrls: [net.explorerUrl],
              }],
            });
          } else throw switchErr;
        }
      }
      const freshProvider = new ethers.providers.Web3Provider(window.ethereum);
      const confirmedNetwork = await freshProvider.getNetwork();
      console.log('[wallet] chainId:', confirmedNetwork.chainId, '| expected:', net.chainId);
      console.log('[wallet] RPC/network:', confirmedNetwork.name);
      console.log('[wallet] USDC address:', net.usdcAddress);

      if (confirmedNetwork.chainId !== net.chainId) {
        setWrongNetwork(true);
        showToast('error', `Wrong network. Switch MetaMask to ${net.chainName}.`);
        return;
      }

      const signer = freshProvider.getSigner();
      const address = await signer.getAddress();

      const tempClient = new ClobClient(net.clobApi, net.chainId, signer);
      const apiCreds = await tempClient.createOrDeriveApiKey();
      const client = new ClobClient(net.clobApi, net.chainId, signer, apiCreds, 0, address);

      const usdcContract = new ethers.Contract(
        net.usdcAddress,
        ['function balanceOf(address) view returns (uint256)'],
        freshProvider,
      );
      console.log('[wallet] querying balanceOf on', net.usdcAddress, 'for', address);
      const raw = await usdcContract.balanceOf(address);
      console.log('[wallet] raw balance:', raw.toString());
      const balance = ethers.utils.formatUnits(raw, 6);

      setWalletAddress(address);
      setWalletBalance(balance);
      setClobClient(client);
      await checkGeo();
      localStorage.setItem('walletConnected', '1');
      localStorage.setItem('clobApiCreds', JSON.stringify({
        key: apiCreds.key,
        secret: apiCreds.secret,
        passphrase: apiCreds.passphrase,
      }));
      showToast('success', `Connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
    } catch (err) {
      if (err.code === 4001) showToast('error', 'Connection rejected.');
      else showToast('error', `Connect failed: ${err.message}`);
    }
  };

  const disconnectWallet = () => {
    if (!window.confirm('Disconnect wallet?')) return;
    clearWalletState();
  };

  // Silent reconnect on refresh — no MetaMask popup, uses cached creds
  useEffect(() => {
    const stored = localStorage.getItem('walletConnected');
    const storedCreds = localStorage.getItem('clobApiCreds');
    if (!stored || !storedCreds || !window.ethereum) return;

    const silentReconnect = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts.length) { clearWalletState(); return; }

        const net = MAINNET;
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        if (network.chainId !== net.chainId) { setWrongNetwork(true); return; }

        const signer = provider.getSigner();
        const address = await signer.getAddress();
        const apiCreds = JSON.parse(storedCreds);

        const client = new ClobClient(net.clobApi, net.chainId, signer, apiCreds, 0, address);

        const usdcContract = new ethers.Contract(
          net.usdcAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider,
        );
        const raw = await usdcContract.balanceOf(address);
        const balance = ethers.utils.formatUnits(raw, 6);

        setWalletAddress(address);
        setWalletBalance(balance);
        setClobClient(client);
        await checkGeo();
        localStorage.setItem('walletConnected', '1');
      } catch (err) {
        console.error('[wallet] silent reconnect failed:', err);
        clearWalletState();
      }
    };

    silentReconnect();
  }, []);

  // Clear wallet state when MetaMask switches chains or accounts
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChainChanged = () => {
      setWrongNetwork(false);
      clearWalletState();
    };
    const handleAccountsChanged = (accounts) => {
      if (!accounts.length) clearWalletState();
      else clearWalletState();
    };
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return {
    walletAddress, setWalletAddress,
    walletBalance, setWalletBalance,
    clobClient,
    geoBlocked,
    wrongNetwork,
    connectWallet,
    disconnectWallet,
    clearWalletState,
  };
}
