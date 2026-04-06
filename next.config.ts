import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@remotion/player", "remotion"],
};

export default nextConfig;
