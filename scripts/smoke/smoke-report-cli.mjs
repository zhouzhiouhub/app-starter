import { redactSmokeSecrets } from "./smoke-secrets.mjs";
import {
  readFailureActions,
  readFailureDiagnosis,
} from "./smoke-report-diagnostics.mjs";

const maxFailureDetailCount = 3;
const maxFailureLabelLength = 96;
const maxFailureMessageLength = 220;

export function printSmokeReportSummary(report, writer = console) {
  const lines = formatSmokeReportSummary(report);
  const write = isSmokeSummaryClean(report?.summary)
    ? (writer.log ?? writer.warn)
    : (writer.warn ?? writer.log);

  for (const line of lines) {
    write.call(writer, line);
  }
}

export function formatSmokeReportSummary(report) {
  const summary = readSummary(report);
  const failedChecks = readFailedChecks(summary.failedChecks);
  const failedCheckDetails = readFailedCheckDetails(summary.failedCheckDetails);
  const lines = [
    `\nSmoke report summary (${formatText(report?.schemaVersion, "unknown")}):`,
    `  Status: ${formatText(summary.status, "unknown")}`,
    `  Checks: ${readCount(summary.passedCheckCount)}/${readCount(summary.checkCount)} passed, ${readCount(summary.failedCheckCount)} failed`,
    `  Smoke passed: ${isSmokeSummaryPassed(summary) ? "yes" : "no"}`,
    `  Production gates: ${summary.productionReady === true ? "passed" : "blocked"}`,
  ];
  const blockerCount = readCount(summary.blockerCount);
  const warningCount = readCount(summary.warningCount);

  if (blockerCount > 0 || warningCount > 0) {
    lines.push(`  Readiness: ${blockerCount} blockers, ${warningCount} warnings`);
  }

  if (failedChecks.length > 0) {
    lines.push(`  Failed checks: ${failedChecks.join(", ")}`);
  }

  if (failedCheckDetails.length > 0) {
    lines.push("  Failure details:");
    lines.push(...formatFailureDetailLines(failedCheckDetails));
  }

  const failureActions = readFailureActions(failedCheckDetails);
  if (failureActions.length > 0) {
    lines.push("  Suggested fixes:");
    lines.push(...failureActions.map((action) => `    - ${action}`));
  }

  return lines.map((line) => redactSmokeSecrets(line));
}

function readSummary(report) {
  return report?.summary && typeof report.summary === "object"
    ? report.summary
    : {};
}

function isSmokeSummaryClean(summary) {
  return isSmokeSummaryPassed(summary) && summary?.productionReady === true;
}

function isSmokeSummaryPassed(summary) {
  return summary?.status === "passed" && readCount(summary?.failedCheckCount) === 0;
}

function readFailedChecks(value) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.length > 0)
        .map((item) => formatCliLabel(item, "unknown", maxFailureLabelLength))
    : [];
}

function readFailedCheckDetails(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      details: readPlainRecord(item.details),
      message: formatText(item.message, "No error message captured."),
      name: formatCliLabel(
        item.name,
        `unnamed-check-${index + 1}`,
        maxFailureLabelLength,
      ),
    }));
}

function formatFailureDetailLines(details) {
  const visible = details.slice(0, maxFailureDetailCount);
  const remainingCount = details.length - visible.length;
  const lines = visible.map((detail) => {
    const message = formatCliText(
      detail.message,
      "No error message captured.",
      maxFailureMessageLength,
    );
    const diagnosis = formatCliLabel(
      readFailureDiagnosis(detail.details),
      "",
      maxFailureLabelLength,
    );
    const suffix =
      diagnosis && !message.includes(diagnosis)
        ? ` (diagnosis: ${diagnosis})`
        : "";

    return `    - ${detail.name}: ${message}${suffix}`;
  });

  if (remainingCount > 0) {
    lines.push(`    - ... and ${remainingCount} more failed checks`);
  }

  return lines;
}

function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function formatText(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatCliLabel(value, fallback, maxLength) {
  return formatCliText(value, fallback, maxLength);
}

function formatCliText(value, fallback, maxLength) {
  return truncateText(
    normalizeCliText(redactSmokeSecrets(formatText(value, fallback))),
    maxLength,
  );
}

function normalizeCliText(value) {
  return replaceControlCharacters(value).replace(/\s+/g, " ").trim();
}

function replaceControlCharacters(value) {
  let result = "";

  for (const character of String(value)) {
    const code = character.charCodeAt(0);
    result += code <= 31 || code === 127 ? " " : character;
  }

  return result;
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function truncateText(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}
