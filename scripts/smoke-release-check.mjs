#!/usr/bin/env node

import { readErrorMessage } from "./smoke/smoke-error-message.mjs";
import {
  createSmokeReleaseCheck,
  formatSmokeReleaseCheck,
  readSmokeReleaseCheckArtifact,
  readSmokeReleaseCheckCliConfig,
} from "./smoke/smoke-release-check.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

try {
  const config = readSmokeReleaseCheckCliConfig(process.argv.slice(2));
  const artifact = await readSmokeReleaseCheckArtifact(config);
  const releaseCheck = createSmokeReleaseCheck(artifact);

  for (const line of formatSmokeReleaseCheck(artifact)) {
    console.log(line);
  }

  process.exit(releaseCheck.releaseReady ? 0 : 1);
} catch (error) {
  console.error(`Smoke release evidence check failed: ${readErrorMessage(error)}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage:
  pnpm smoke:release-check
  pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json

Options:
  --latest       Check the newest archived smoke report (default).
  -h, --help     Show this help.

Release evidence:
  The check passes only when the report is complete, production-ready, and
  proves R2/CDN, Admin static app, publish, rollback, SEO, and ISR smoke gates.`);
}
