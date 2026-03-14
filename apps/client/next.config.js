// next.config.js
const withPlugins = require('next-compose-plugins');
const removeImports = require('next-remove-imports')();
const nextTranslate = require('next-translate');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  output: 'standalone',

  // Configuração de i18n obrigatória para next-translate + Next.js 14+
  // localeDetection deve ser literalmente false (booleano)
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

  // Configuração de imagens
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Variáveis de ambiente disponíveis no build
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003',
  },

  // Webpack config para módulos nativos
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
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

module.exports = withPlugins(
  [removeImports, nextTranslate, withPWA],
  nextConfig
);
