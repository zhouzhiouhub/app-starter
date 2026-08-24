import { redactSmokeSecrets } from "./smoke-secrets.mjs";

const maxFailureDetailCount = 3;
const maxFailureMessageLength = 220;
const revalidationFailureActions = new Map([
  [
    "invalid-revalidation-payload",
    "Check the API and Web revalidation payload contract.",
  ],
  [
    "missing-secret",
    "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.",
  ],
  [
    "missing-url",
    "Set STOREFRONT_REVALIDATE_URL or WEB_URL to the deployed storefront.",
  ],
  [
    "request-timeout",
    "Verify the Web deployment is reachable from the API and increase timeout only after connectivity is healthy.",
  ],
  [
    "revalidate-route-missing",
    "Verify the Web deployment exposes /api/revalidate at STOREFRONT_REVALIDATE_URL.",
  ],
  [
    "revalidation-secret-mismatch",
    "Make STOREFRONT_REVALIDATE_SECRET match between API and Web runtimes.",
  ],
  [
    "web-revalidation-not-configured",
    "Configure STOREFRONT_REVALIDATE_SECRET in the Web runtime.",
  ],
]);

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
        .map((item) => formatText(item, "unknown"))
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
      name: formatText(item.name, `unnamed-check-${index + 1}`),
    }));
}

function formatFailureDetailLines(details) {
  const visible = details.slice(0, maxFailureDetailCount);
  const remainingCount = details.length - visible.length;
  const lines = visible.map((detail) => {
    const message = truncateText(detail.message, maxFailureMessageLength);
    const diagnosis = readFailureDiagnosis(detail.details);
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

function readFailureActions(details) {
  const actions = details.flatMap((detail) => {
    const diagnosis = readFailureDiagnosis(detail.details);
    const action = diagnosis
      ? revalidationFailureActions.get(diagnosis)
      : undefined;

    return action ? [action] : [];
  });

  return [...new Set(actions)];
}

function readFailureDiagnosis(details) {
  const revalidation = readPlainRecord(details.revalidation);
  return typeof revalidation.diagnosis === "string" &&
    revalidation.diagnosis.length > 0
    ? revalidation.diagnosis
    : null;
}

function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function formatText(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function truncateText(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}
