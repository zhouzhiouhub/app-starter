import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const testFiles = readdirSync(scriptDir)
  .filter((fileName) => fileName.endsWith(".test.mjs"))
  .sort((left, right) => left.localeCompare(right))
  .map((fileName) => join(scriptDir, fileName));

if (testFiles.length === 0) {
  console.error(`No visual test files found in ${scriptDir}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
