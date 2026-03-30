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
    const webpack = require('webpack');

    if (!isServer) {
      config.resolve.fallback = {
        buffer:  require.resolve('buffer/'),
        crypto:  require.resolve('crypto-browserify'),
        stream:  require.resolve('stream-browserify'),
        process: require.resolve('process/browser'),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer:  ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );
    }

    // postgres (and other modern packages) use node: URI imports (node:crypto,
    // node:net, etc.) which webpack doesn't resolve by default. Strip the prefix
    // so webpack falls through to Node built-ins on the server, or to the
    // resolve.fallback polyfills on the client.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      }),
    );

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'postgres'],
  },
};

export default withSentryConfig(nextConfig, { silent: true, org: '', project: '' });
