import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@record-me/ui', '@record-me/recorder'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self)',
          },
        ],
      },
    ];
  },
};

export default config;
