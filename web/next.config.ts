import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Enable polling for file watching in Docker (more reliable than webpackDevMiddleware)
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding after the first change
        ignored: /node_modules/, // Ignore node_modules to reduce load
      };
    }
    return config;
  },
  // Add empty turbopack config to allow production builds with Turbopack
  // while keeping webpack config for dev mode file watching
  turbopack: {},
};

export default nextConfig;
