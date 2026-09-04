import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    "@app-starter/design-tokens",
    "@app-starter/renderer",
    "@app-starter/schema",
    "@app-starter/ui",
  ],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@app-starter/design-tokens": path.join(
        repoRoot,
        "packages/design-tokens/src/index.ts",
      ),
      "@app-starter/renderer": path.join(
        repoRoot,
        "packages/renderer/src/index.tsx",
      ),
      "@app-starter/schema": path.join(
        repoRoot,
        "packages/schema/src/index.ts",
      ),
      "@app-starter/ui": path.join(repoRoot, "packages/ui/src/index.tsx"),
    };
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };

    return config;
  },
};

export default nextConfig;
