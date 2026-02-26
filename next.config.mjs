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
  serverExternalPackages: ["pino", "thread-stream"],
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
}

export default nextConfig
