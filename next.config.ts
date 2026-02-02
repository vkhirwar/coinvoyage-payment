import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@coin-voyage/paykit",
    "@coin-voyage/crypto",
    "@coin-voyage/shared",
  ],
  turbopack: {},
};

export default nextConfig;
