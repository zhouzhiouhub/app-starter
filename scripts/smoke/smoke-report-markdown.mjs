import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  formatSmokeReportFailureActions,
  formatSmokeReportReview,
} from "./smoke-report-review.mjs";
import { createSmokeReportSummary } from "./smoke-report-summary.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

const maxMarkdownItemCount = 20;
const maxMarkdownTextLength = 420;

export function createSmokeReportReviewMarkdown(artifact) {
  const report = artifact?.report ?? artifact;
  const summary = artifact?.summary ?? createSmokeReportSummary(report);
  const readiness = readPlainRecord(report?.productionReadiness);

  const lines = [
    "# Production Smoke Report",
    "",
    `Archive: ${formatCode(artifact?.path)}`,
    `Schema: ${formatCode(report?.schemaVersion)}`,
    `Status: ${formatCode(summary.status)}`,
    `Smoke passed: ${isSmokeSummaryPassed(summary) ? "yes" : "no"}`,
    `Production gates: ${summary.productionReady === true ? "passed" : "blocked"}`,
    "",
    "## Metadata",
    "",
    ...formatMetadata(report),
    "",
    "## Checks",
    "",
    ...formatChecks(summary),
    "",
    "## Production Readiness",
    "",
    ...formatReadiness(readiness),
    "",
    "## Traceability",
    "",
    ...formatTraceability(artifact),
    "",
    "## Failure Details",
    "",
    ...formatFailureDetails(summary.failedCheckDetails),
    "",
    "## Suggested Fixes",
    "",
    ...formatSuggestedFixes(report),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export function createSmokeReportArchiveIndexMarkdown(artifacts) {
  const lines = [
    "# Production Smoke Archive",
    "",
    ...formatArchiveIndex(artifacts),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writeSmokeReportMarkdown(outputPath, markdown) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

function formatMetadata(report) {
  return [
    `- Started: ${formatText(report?.startedAt)}`,
    `- Finished: ${formatText(report?.finishedAt, "not finished")}`,
    `- Slug: ${formatText(report?.slug)}`,
    `- Storefront URL: ${formatText(report?.storefrontUrl)}`,
    `- Storefront request URL: ${formatText(report?.storefrontRequestUrl)}`,
  ];
}

function formatChecks(summary) {
  return [
    `- Passed: ${readCount(summary.passedCheckCount)}/${readCount(
      summary.checkCount,
    )}`,
    `- Failed: ${readCount(summary.failedCheckCount)}`,
    `- Failed checks: ${formatList(summary.failedChecks)}`,
    `- Readiness blockers: ${readCount(summary.blockerCount)}`,
    `- Readiness warnings: ${readCount(summary.warningCount)}`,
  ];
}

function formatReadiness(readiness) {
  return [
    `- Production ready: ${readiness.productionReady === true ? "yes" : "no"}`,
    "- Blockers:",
    ...formatReadinessItems(readiness.blockers),
    "- Warnings:",
    ...formatReadinessItems(readiness.warnings),
    "- Next actions:",
    ...formatNextActions(readiness.nextActions),
  ];
}

function formatTraceability(artifact) {
  const lines = formatSmokeReportReview(artifact);
  const traceabilityStart = lines.findIndex((line) => line === "Traceability:");

  if (traceabilityStart < 0) {
    return ["- Not recorded"];
  }

  const traceability = lines.slice(traceabilityStart + 1).filter(Boolean);

  return traceability.length > 0
    ? traceability.map((line) => `- ${formatText(line)}`)
    : ["- Not recorded"];
}

function formatFailureDetails(details) {
  const items = Array.isArray(details) ? details : [];

  if (items.length === 0) {
    return ["- None"];
  }

  return [
    ...items.slice(0, maxMarkdownItemCount).map(formatFailureDetail),
    ...formatHiddenCount(items.length, maxMarkdownItemCount, "failed checks"),
  ];
}

function formatFailureDetail(detail, index) {
  const name = formatText(detail?.name, `unnamed-check-${index + 1}`);
  const message = formatText(detail?.message, "No error message captured.");

  return `- ${name}: ${message}`;
}

function formatSuggestedFixes(report) {
  const actions = formatSmokeReportFailureActions(report);

  if (actions.length === 0) {
    return ["- None"];
  }

  return [
    ...actions.slice(0, maxMarkdownItemCount).map((action) => `- ${formatText(action)}`),
    ...formatHiddenCount(actions.length, maxMarkdownItemCount, "suggested fixes"),
  ];
}

function formatReadinessItems(items) {
  const values = Array.isArray(items) ? items : [];

  if (values.length === 0) {
    return ["  - None"];
  }

  return [
    ...values.slice(0, maxMarkdownItemCount).map(formatReadinessItem),
    ...formatHiddenCount(values.length, maxMarkdownItemCount, "items").map(
      (line) => `  ${line}`,
    ),
  ];
}

function formatReadinessItem(item) {
  const area = formatText(item?.area);
  const issue = formatText(item?.issue);
  const message = formatText(item?.message);

  return `  - ${area}: ${issue} - ${message}`;
}

function formatNextActions(actions) {
  const values = Array.isArray(actions) ? actions : [];

  if (values.length === 0) {
    return ["  - None"];
  }

  return [
    ...values
      .slice(0, maxMarkdownItemCount)
      .map((item) => `  - ${formatText(item?.area)}: ${formatText(item?.action)}`),
    ...formatHiddenCount(values.length, maxMarkdownItemCount, "actions").map(
      (line) => `  ${line}`,
    ),
  ];
}

function formatArchiveIndex(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return ["- No smoke reports found."];
  }

  return artifacts.map(formatArchiveIndexItem);
}

function formatArchiveIndexItem(artifact, index) {
  const summary = artifact?.summary ?? createSmokeReportSummary(artifact?.report);
  const status = formatText(summary.status);
  const checks = `${readCount(summary.passedCheckCount)}/${readCount(
    summary.checkCount,
  )}`;
  const production = summary.productionReady === true ? "ready" : "blocked";
  const finishedAt = formatText(artifact?.finishedAt, "not finished");

  return `- ${index + 1}. ${formatText(artifact?.path)}: ${status}, ${checks} checks, production ${production}, ${finishedAt}`;
}

function formatHiddenCount(total, visible, label) {
  const hidden = total - visible;

  return hidden > 0 ? [`- ... and ${hidden} more ${label}`] : [];
}

function formatList(values) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];

  if (list.length === 0) {
    return "none";
  }

  return formatText(list.join(", "));
}

function isSmokeSummaryPassed(summary) {
  return summary?.status === "passed" && readCount(summary.failedCheckCount) === 0;
}

function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value, fallback = "unknown") {
  return formatSmokeText(value, {
    fallback,
    maxLength: maxMarkdownTextLength,
  });
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
