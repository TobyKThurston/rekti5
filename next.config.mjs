import { createRequire } from 'module';
import { withSentryConfig } from '@sentry/nextjs';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/gamma-api/:path*', destination: 'https://gamma-api.polymarket.com/:path*' },
      { source: '/clob-api/:path*',  destination: 'https://clob.polymarket.com/:path*' },
      { source: '/polygon-rpc',      destination: 'https://polygon-bor-rpc.publicnode.com/' },
      { source: '/polymarket/:path*', destination: 'https://polymarket.com/:path*' },
    ];
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        buffer:  require.resolve('buffer/'),
        crypto:  require.resolve('crypto-browserify'),
        stream:  require.resolve('stream-browserify'),
        process: require.resolve('process/browser'),
      };
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer:  ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default withSentryConfig(nextConfig, { silent: true, org: '', project: '' });
