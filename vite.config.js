import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'process'],
      globals: { Buffer: true, process: true },
    }),
  ],
  resolve: {
    alias: { ethers: 'ethers/lib/index.js' }, // Vite+ethers v5 quirk fix
  },
  server: {
    proxy: {
      '/gamma-api': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gamma-api/, ''),
      },
      '/clob-api': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/clob-api/, ''),
      },
      '/polygon-rpc': {
        target: 'https://polygon-bor-rpc.publicnode.com',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/polymarket': {
        target: 'https://polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/polymarket/, ''),
      },
    },
  },
});
