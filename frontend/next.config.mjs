import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip type checking during build (Solana wallet adapter has React types mismatch)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer }) => {
    // pdf-parse mencoba load test files yang tidak ada di Next.js
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        encoding: false,
      };
      // QVAC menggunakan native Node addons + Bare worker — jangan di-bundle webpack
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@qvac/sdk",
        "@qvac/cli",
      ];
    }
    // Izinkan import dari contractguard-agent/ yang ada di luar frontend/
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, ".."),
    ];
    // Suppress optional peer deps yang tidak dipakai
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      encoding: false,
    };
    return config;
  },
};
export default nextConfig;
