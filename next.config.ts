import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  deploymentId: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.DEPLOYMENT_VERSION,
};

export default nextConfig;
