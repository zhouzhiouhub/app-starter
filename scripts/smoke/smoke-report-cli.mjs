import { redactSmokeSecrets } from "./smoke-secrets.mjs";

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

function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function formatText(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
