import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  transpilePackages: [
    "pino",
    "thread-stream",
    "@walletconnect/ethereum-provider",
    "@walletconnect/logger",
    "@walletconnect/universal-provider"
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "tap",
      "desm",
      "tape",
      "why-is-node-running",
      "fastbench",
      "pino-elasticsearch"
    );
    return config;
  },
  turbopack: {},
}

export default withNextIntl(nextConfig);
