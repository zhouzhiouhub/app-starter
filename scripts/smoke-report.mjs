#!/usr/bin/env node

import {
  defaultSmokeReportArchiveRoots,
  discoverSmokeReportArtifacts,
  readSmokeReportArtifact,
} from "./smoke/smoke-report-archive.mjs";
import {
  formatSmokeReportArchiveIndex,
  formatSmokeReportReview,
} from "./smoke/smoke-report-review.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

const defaultListLimit = 5;
const maxListLimit = 50;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

try {
  const config = readSmokeReportCliConfig(process.argv.slice(2));
  const artifacts = await readSmokeReportArtifacts(config);

  if (artifacts.length === 0) {
    throw new Error(
      `No smoke reports found under ${defaultSmokeReportArchiveRoots.join(
        "/, ",
      )}/. Run SMOKE_REPORT_PATH=reports/production/smoke-report.json pnpm smoke:publish first.`,
    );
  }

  const lines = config.list
    ? formatSmokeReportArchiveIndex(artifacts)
    : formatSmokeReportReview(artifacts[0]);

  for (const line of lines) {
    console.log(line);
  }
} catch (error) {
  console.error(`Smoke report review failed: ${readErrorMessage(error)}`);
  process.exit(1);
}

export function readSmokeReportCliConfig(args) {
  const config = {
    limit: defaultListLimit,
    list: false,
    reportPath: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--list") {
      config.list = true;
      continue;
    }

    if (arg === "--latest") {
      config.list = false;
      continue;
    }

    if (arg === "--limit") {
      config.limit = readLimit(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      config.limit = readLimit(arg.slice("--limit=".length));
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown smoke report option: ${arg}`);
    }

    if (config.reportPath) {
      throw new Error("Provide only one smoke report path.");
    }

    config.reportPath = arg;
  }

  if (config.reportPath && config.list) {
    throw new Error("Use either --list or a single smoke report path.");
  }

  return config;
}

async function readSmokeReportArtifacts(config) {
  if (config.reportPath) {
    return [await readSmokeReportArtifact(config.reportPath)];
  }

  return discoverSmokeReportArtifacts({
    limit: config.list ? config.limit : 1,
  });
}

function readLimit(value) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > maxListLimit) {
    throw new Error(`--limit must be an integer from 1 to ${maxListLimit}.`);
  }

  return limit;
}

function printHelp() {
  console.log(`Usage:
  pnpm smoke:report
  pnpm smoke:report -- --list --limit=10
  pnpm smoke:report -- reports/production/smoke-report.json

Options:
  --latest       Review the newest archived smoke report (default).
  --list         List recent archived smoke reports.
  --limit <n>    Limit archive list output, from 1 to ${maxListLimit}.
  -h, --help     Show this help.

Archives:
  Reports are discovered under ${defaultSmokeReportArchiveRoots.join(
    "/, ",
  )}/ and must use the ${"SMOKE_REPORT_PATH"} safe relative JSON path rules.`);
}
