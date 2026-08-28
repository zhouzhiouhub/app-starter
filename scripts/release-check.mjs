#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  formatReleaseEvidenceCheck,
  readReleaseCheckCliConfig,
  readReleaseEvidenceCheck,
} from "./release/release-check.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runReleaseCheckCli(args, input = {}) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp(input.stdout ?? console.log);
    return 0;
  }

  try {
    const config = readReleaseCheckCliConfig(args);
    const check = await readReleaseEvidenceCheck(config, input);
    const writeLine = input.stdout ?? console.log;

    for (const line of formatReleaseEvidenceCheck(check)) {
      writeLine(line);
    }

    return check.releaseReady ? 0 : 1;
  } catch (error) {
    const writeError = input.stderr ?? console.error;
    writeError(`Release evidence check failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:check
  pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json
  pnpm release:check -- artifacts/production-smoke/smoke-report.json

Options:
  --latest                   Check the newest archived smoke report (default).
  --smoke-report <path>      Check a specific production smoke report.
  --visual-manifest <path>   Check a specific Page Builder visual manifest.
  -h, --help                 Show this help.

Release evidence:
  The gate passes only when production smoke evidence is release-ready and
  Page Builder visual acceptance is fully accepted with retained evidence.`);
}

if (isMainModule()) {
  process.exitCode = await runReleaseCheckCli(process.argv.slice(2));
}
