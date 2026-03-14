// next.config.js - Versão sem next-compose-plugins (mais confiável)
const removeImports = require('next-remove-imports')();
const nextTranslate = require('next-translate');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false,
});

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: false,
  swcMinify: true,
  output: 'standalone',

  // i18n - CRÍTICO: deve ser exatamente false (booleano), não string
  i18n: {
    locales: ['en', 'pt'],
    defaultLocale: 'en',
    localeDetection: false,
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:5003/api/v1/:path*',
      },
    ];
  },

  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003',
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
      };
    }
    return config;
  },
};

// Aplica plugins manualmente na ordem correta
// 1. next-translate → 2. removeImports → 3. PWA
const withNextTranslate = nextTranslate(baseConfig);
const withRemoveImports = removeImports(withNextTranslate);
module.exports = withPWA(withRemoveImports);
