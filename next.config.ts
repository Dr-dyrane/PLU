import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next.js as the source code while still producing ordinary HTML/CSS/JS.
  output: "export",
  trailingSlash: true,
  images: {
    // Static exports have no on-demand image server.
    unoptimized: true,
  },
};

export default nextConfig;
