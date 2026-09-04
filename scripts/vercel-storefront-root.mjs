import { existsSync } from "node:fs";

if (process.env.VERCEL === "1" && !existsSync("next.config.mjs")) {
  console.error(
    "This Vercel project is building the monorepo root, so the storefront is not deployed as Next.js.",
  );
  console.error(
    "Set Settings → General → Root Directory to apps/web, save, then Redeploy.",
  );
  process.exit(1);
}
