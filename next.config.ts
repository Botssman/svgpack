import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: do NOT use `output: "standalone"` on Vercel.
  // Standalone mode bundles everything into a single server.js, which is
  // good for self-hosted (Docker/VPS) but BREAKS Vercel's serverless
  // function model where each /api/* route must be a separate function.
  // On Vercel, Next.js is auto-detected and you don't need standalone.
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
