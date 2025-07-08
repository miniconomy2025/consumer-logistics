import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enables static HTML export
  trailingSlash: true, 
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['app'],
    // Allow production builds to successfully complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to successfully complete even if there are type errors
    ignoreBuildErrors: false,
  },
  // Configure external packages
  serverExternalPackages: [],
};

export default nextConfig;
