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
  // The second argument includes Next.js's own webpack instance — use it
  // instead of require('webpack') so plugins are registered on the correct
  // internal build of webpack that Next.js actually uses.
  webpack(config, { isServer, webpack: wp }) {
    if (!isServer) {
      // Explicit node: fallbacks so packages like @polymarket/builder-signing-sdk
      // (node:crypto) work in the browser bundle without any plugin magic.
      config.resolve.fallback = {
        buffer:       require.resolve('buffer/'),
        crypto:       require.resolve('crypto-browserify'),
        'node:crypto': require.resolve('crypto-browserify'),
        stream:       require.resolve('stream-browserify'),
        'node:stream': require.resolve('stream-browserify'),
        process:      require.resolve('process/browser'),
      };
      config.plugins.push(
        new wp.ProvidePlugin({
          Buffer:  ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );
    }

    // Belt-and-suspenders: strip node: prefix for any remaining cases
    // (e.g. postgres on the server before serverComponentsExternalPackages kicks in).
    config.plugins.push(
      new wp.NormalModuleReplacementPlugin(/^node:/, (resource) => {
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
