import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app-starter/admin-theme": path.join(
        repoRoot,
        "packages/admin-theme/src/index.ts"
      ),
      "@app-starter/custom-admin": path.join(
        repoRoot,
        "packages/custom-admin/src/index.ts"
      ),
      "@app-starter/renderer": path.join(
        repoRoot,
        "packages/renderer/src/index.tsx"
      ),
      "@app-starter/schema": path.join(repoRoot, "packages/schema/src/index.ts"),
      "@app-starter/ui": path.join(
        repoRoot,
        "packages/ui/src/index.tsx"
      )
    }
  },
  server: {
    port: 5173
  }
});
