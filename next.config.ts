import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: 5 * 1024 * 1024 + 20 * 1024,
    },
  },
};

export default nextConfig;
