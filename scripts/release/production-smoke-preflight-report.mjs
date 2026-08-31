import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createProductionSmokeWorkflowArtifactsSummary } from "./production-smoke-release-artifacts.mjs";
import { isProductionSmokeEnvironment } from "../smoke/publish-smoke-login-config.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import {
  normalizeSmokeReportMarkdownPath,
  normalizeSmokeReportPath,
} from "../smoke/smoke-report-path-config.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const preflightReportSchemaVersion = "production-smoke-preflight.v1";
const maxPreflightErrorMessageLength = 3000;
const maxMarkdownTextLength = 3000;

export function createProductionSmokePreflightReport(input = {}) {
  const errorMessage = input.error
    ? readProductionSmokePreflightErrorMessage(input.error)
    : null;

  return {
    schemaVersion: preflightReportSchemaVersion,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: errorMessage ? "failed" : "passed",
    productionRuntimeReadinessRequired: isProductionSmokeEnvironment(
      input.env ?? process.env,
    ),
    releaseNotesEnabled: input.result?.releaseNotesEnabled ?? null,
    releaseNotesAllowBlocked: input.result?.releaseNotesAllowBlocked ?? null,
    visualArtifactDownloadEnabled:
      input.result?.visualArtifactDownloadEnabled ?? null,
    workflowArtifacts: createReportWorkflowArtifacts(input),
    error: errorMessage ? { message: errorMessage } : null,
  };
}

export async function writeProductionSmokePreflightReport(outputs, input = {}) {
  const report = createProductionSmokePreflightReport({ ...input, outputs });
  const writes = [];

  if (outputs.jsonOutput) {
    writes.push(writeJsonReport(outputs.jsonOutput, report));
  }

  if (outputs.markdownOutput) {
    writes.push(
      writeMarkdownReport(
        outputs.markdownOutput,
        createProductionSmokePreflightMarkdown(report),
      ),
    );
  }

  await Promise.all(writes);
  return report;
}

export function normalizeProductionSmokePreflightJsonReportPath(value) {
  try {
    return normalizeSmokeReportPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "SMOKE_REPORT_PATH",
        "Preflight report",
      ),
    );
  }
}

export function normalizeProductionSmokePreflightMarkdownReportPath(value) {
  try {
    return normalizeSmokeReportMarkdownPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Smoke report Markdown",
        "Preflight report Markdown",
      ),
    );
  }
}

export function readProductionSmokePreflightErrorMessage(error) {
  return formatSmokeText(error instanceof Error ? error.message : error, {
    fallback: "Unknown production smoke release input validation failure.",
    maxLength: maxPreflightErrorMessageLength,
  });
}

function createProductionSmokePreflightMarkdown(report) {
  const lines = [
    "# Production Smoke Preflight",
    "",
    `Generated: ${formatCode(report.generatedAt)}`,
    `Status: ${formatCode(report.status)}`,
    `Production runtime readiness required: ${
      report.productionRuntimeReadinessRequired ? "yes" : "no"
    }`,
    "",
    "## Release Inputs",
    "",
    `- Release notes: ${formatNullableBoolean(report.releaseNotesEnabled)}`,
    `- Blocked release note draft: ${formatNullableBoolean(
      report.releaseNotesAllowBlocked,
    )}`,
    `- Visual artifact download: ${formatNullableBoolean(
      report.visualArtifactDownloadEnabled,
    )}`,
    "",
    "## Workflow Artifacts",
    "",
    ...formatWorkflowArtifacts(report.workflowArtifacts),
    "",
    "## Failure",
    "",
    ...(report.error
      ? [`- Message: ${formatText(report.error.message)}`]
      : ["- None"]),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function readSafeWorkflowArtifactsSummary(env) {
  try {
    return createProductionSmokeWorkflowArtifactsSummary(env);
  } catch {
    return null;
  }
}

function createReportWorkflowArtifacts(input) {
  const workflowArtifacts =
    input.result?.workflowArtifacts ??
    readSafeWorkflowArtifactsSummary(input.env ?? process.env);

  if (!workflowArtifacts) {
    return null;
  }

  return {
    ...workflowArtifacts,
    paths: {
      ...workflowArtifacts.paths,
      preflightJson: input.outputs?.jsonOutput ?? null,
      preflightMarkdown: input.outputs?.markdownOutput ?? null,
    },
  };
}

function formatWorkflowArtifacts(workflowArtifacts) {
  if (!workflowArtifacts) {
    return ["- Not recorded"];
  }

  return [
    ...formatArtifactPaths(workflowArtifacts.paths),
    ...formatArtifactNames(workflowArtifacts.artifactNames),
  ];
}

function formatArtifactPaths(paths) {
  if (!paths) {
    return [];
  }

  return [
    `- Smoke report JSON: ${formatCode(paths.smokeReportJson)}`,
    `- Smoke report Markdown: ${formatCode(paths.smokeReportMarkdown)}`,
    `- Preflight JSON: ${formatCode(
      paths.preflightJson ?? "not configured",
    )}`,
    `- Preflight Markdown: ${formatCode(
      paths.preflightMarkdown ?? "not configured",
    )}`,
    `- Release check JSON: ${formatCode(paths.releaseCheckJson)}`,
    `- Release check Markdown: ${formatCode(paths.releaseCheckMarkdown)}`,
    `- Project status JSON: ${formatCode(paths.projectStatusJson)}`,
    `- Project status Markdown: ${formatCode(paths.projectStatusMarkdown)}`,
    `- Release notes Markdown: ${formatCode(paths.releaseNotesMarkdown)}`,
  ];
}

function formatArtifactNames(names) {
  if (!names) {
    return [];
  }

  return [
    `- Smoke report artifact: ${formatCode(names.smokeReport)}`,
    `- Preflight artifact: ${formatCode(names.releasePreflight)}`,
    `- Release check artifact: ${formatCode(names.releaseCheck)}`,
    `- Project status artifact: ${formatCode(names.projectStatus)}`,
    `- Release notes artifact: ${formatCode(names.releaseNotes)}`,
    `- Local verification artifact: ${formatCode(
      names.localVerification ?? "not configured",
    )}`,
  ];
}

async function writeJsonReport(outputPath, report) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function writeMarkdownReport(outputPath, markdown) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

function formatNullableBoolean(value) {
  if (value === null || typeof value === "undefined") {
    return "not reached";
  }

  return value ? "enabled" : "disabled";
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
