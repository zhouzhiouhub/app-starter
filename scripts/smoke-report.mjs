#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  defaultSmokeReportArchiveRoots,
  discoverSmokeReportArtifacts,
  readSmokeReportArtifact,
} from "./smoke/smoke-report-archive.mjs";
import {
  createSmokeReportArchiveIndexMarkdown,
  createSmokeReportReviewMarkdown,
  writeSmokeReportMarkdown,
} from "./smoke/smoke-report-markdown.mjs";
import { normalizeSmokeReportMarkdownPath } from "./smoke/smoke-report-path-config.mjs";
import {
  formatSmokeReportArchiveIndex,
  formatSmokeReportReview,
} from "./smoke/smoke-report-review.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

const defaultListLimit = 5;
const maxListLimit = 50;

export async function runSmokeReportCli(args, input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readSmokeReportCliConfig(args);
    const artifacts = await readSmokeReportArtifacts(config, input);

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

    if (config.markdownOutputPath) {
      await writeSmokeReportMarkdown(
        config.markdownOutputPath,
        createSmokeReportMarkdown(artifacts, config),
      );
    }

    for (const line of lines) {
      stdout(line);
    }

    if (config.markdownOutputPath) {
      stdout(`Smoke report Markdown written: ${config.markdownOutputPath}`);
    }

    return 0;
  } catch (error) {
    stderr(`Smoke report review failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function readSmokeReportCliConfig(args) {
  const config = {
    limit: defaultListLimit,
    list: false,
    markdownOutputPath: null,
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

    if (arg === "--markdown-output") {
      config.markdownOutputPath = normalizeSmokeReportMarkdownPath(
        readOptionValue(arg, args, index),
      );
      index += 1;
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

async function readSmokeReportArtifacts(config, input) {
  if (config.reportPath) {
    return [
      await (input.readReportArtifact ?? readSmokeReportArtifact)(
        config.reportPath,
      ),
    ];
  }

  return (input.discoverReportArtifacts ?? discoverSmokeReportArtifacts)({
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

function createSmokeReportMarkdown(artifacts, config) {
  return config.list
    ? createSmokeReportArchiveIndexMarkdown(artifacts)
    : createSmokeReportReviewMarkdown(artifacts[0]);
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm smoke:report
  pnpm smoke:report -- --list --limit=10
  pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json
  pnpm smoke:report -- reports/production/smoke-report.json

Options:
  --latest                  Review the newest archived smoke report (default).
  --list                    List recent archived smoke reports.
  --limit <n>               Limit archive list output, from 1 to ${maxListLimit}.
  --markdown-output <path>  Write a Markdown review under tmp/, reports/, artifacts/, or .tmp/.
  -h, --help                Show this help.

Archives:
  Reports are discovered under ${defaultSmokeReportArchiveRoots.join(
    "/, ",
  )}/ and must use the ${"SMOKE_REPORT_PATH"} safe relative JSON path rules.`);
}

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runSmokeReportCli(process.argv.slice(2));
}
