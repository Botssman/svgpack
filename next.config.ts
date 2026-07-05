import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: do NOT use `output: "standalone"` on Vercel.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
