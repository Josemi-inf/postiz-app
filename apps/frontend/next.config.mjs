// @ts-check
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { proxyTimeout: 90_000 },
  reactStrictMode: false,
  transpilePackages: ['crypto-hash'],
  productionBrowserSourceMaps: true,

  webpack: (config, { dev, isServer }) => {
    if (!dev) config.devtool = isServer ? 'source-map' : 'hidden-source-map';
    return config;
  },

  images: { remotePatterns: [{ protocol: 'http', hostname: '**' }] },

  // 👇 mantenemos tus redirects existentes
  async redirects() {
    return [
      {
        source: '/api/uploads/:path*',
        destination:
          process.env.STORAGE_PROVIDER === 'local' ? '/uploads/:path*' : '/404',
        permanent: true,
      },
    ];
  },

  // 👇 añadimos rewrites para hacer de reverse-proxy hacia el backend
  async rewrites() {
    return [
      { source: '/api', destination: 'http://postgres_postiz-backend:5001/api' },
      { source: '/api/:path*', destination: 'http://postgres_postiz-backend:5001/api/:path*' },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: false,
    assets: [
      '.next/static/**/*.js',
      '.next/static/**/*.js.map',
      '.next/server/**/*.js',
      '.next/server/**/*.js.map',
    ],
    ignore: [
      '**/node_modules/**',
      '**/*hot-update*',
      '**/_buildManifest.js',
      '**/_ssgManifest.js',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    create: true,
    finalize: true,
    name: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || undefined,
  },
  widenClientFileUpload: true,
  telemetry: false,
  silent: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  errorHandler: (error) => {
    console.warn('Sentry build error occurred:', error.message);
    return;
  },
});
