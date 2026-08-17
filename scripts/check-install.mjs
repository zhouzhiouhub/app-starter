import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nodeModules = join(root, "node_modules");
const lockfile = join(root, "pnpm-lock.yaml");

if (!existsSync(nodeModules) || !existsSync(lockfile)) {
  console.error("");
  console.error("Dependencies are not installed yet.");
  console.error("");
  console.error("Run:");
  console.error("  pnpm install");
  console.error("");
  console.error("Then start the dev servers with:");
  console.error("  pnpm dev");
  console.error("");
  console.error("This project is a pnpm workspace. npm can run wrapper scripts,");
  console.error("but pnpm must install the workspace dependencies first.");
  console.error("");
  process.exit(1);
}
