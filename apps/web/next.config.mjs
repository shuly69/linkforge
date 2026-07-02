/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consume the shared workspace package as source-compatible ESM.
  transpilePackages: ["@linkforge/shared"],
  // `standalone` produces a self-contained server for a small Docker image.
  // It relies on symlinks, which non-admin Windows shells can't create, so it
  // is opt-in via BUILD_STANDALONE (the Dockerfile sets it; local builds skip).
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
