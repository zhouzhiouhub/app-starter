#!/usr/bin/env node

import {
  printHelp,
  readConfig,
  readErrorMessage,
  runSmokeTest,
} from "./smoke/publish-smoke.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

try {
  await runSmokeTest(readConfig());
} catch (error) {
  console.error(`\nSmoke publish failed: ${readErrorMessage(error)}`);
  process.exit(1);
}
