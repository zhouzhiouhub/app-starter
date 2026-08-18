import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const apiProxy = {
  "/api": {
    changeOrigin: true,
    target: "http://127.0.0.1:4000",
  },
};

function redirectBrowserLoginGet(): Plugin {
  function attach(server: {
    middlewares: {
      use: (
        handler: (
          req: IncomingMessage,
          res: ServerResponse,
          next: () => void,
        ) => void,
      ) => void;
    };
  }) {
    server.middlewares.use(
      (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!isAuthLoginGet(req)) {
          next();
          return;
        }

        res.statusCode = 302;
        res.setHeader("Location", "/login");
        res.end();
      },
    );
  }

  return {
    configurePreviewServer: attach,
    configureServer: attach,
    name: "redirect-browser-login-get",
  };
}

function isAuthLoginGet(req: IncomingMessage): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const requestPath = (req.url ?? "").split("?")[0];
  return requestPath === "/api/v1/auth/login";
}

export default defineConfig({
  envDir: repoRoot,
  plugins: [react(), redirectBrowserLoginGet()],
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
  preview: {
    port: 5173,
    proxy: apiProxy,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: apiProxy,
  }
});
