import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  smokeCheckStatuses,
  smokeReportSchemaVersion,
  writableReportFields,
} from "./smoke-report-contract.mjs";
import {
  createSmokeReportSummary,
  refreshSmokeReportSummary,
} from "./smoke-report-summary.mjs";
import { redactSmokeReportValue } from "./smoke-secrets.mjs";

export async function writeSmokeReportIfConfigured(input, report) {
  if (!input.reportPath) {
    return;
  }

  if (isPlainRecord(report)) {
    refreshSmokeReportSummary(report);
  }
  assertSmokeReportWritable(report);
  await mkdir(dirname(input.reportPath), { recursive: true });
  await writeFile(
    input.reportPath,
    `${JSON.stringify(redactSmokeReportValue(report), null, 2)}\n`,
    "utf8",
  );
  console.log(`Smoke report written: ${input.reportPath}`);
}

export function assertSmokeReportWritable(report) {
  const missingFields = writableReportFields.filter(
    (field) => !hasReportField(report, field),
  );

  if (report?.schemaVersion !== smokeReportSchemaVersion) {
    missingFields.push("schemaVersion");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Smoke report is missing required fields: ${[
        ...new Set(missingFields),
      ].join(", ")}.`,
    );
  }

  if (!Array.isArray(report.checks)) {
    throw new Error("Smoke report checks must be an array.");
  }
  assertSmokeReportChecksWellFormed(report.checks);

  if (!isPlainRecord(report.productionReadiness)) {
    throw new Error("Smoke report productionReadiness must be an object.");
  }

  if (!isPlainRecord(report.summary)) {
    throw new Error("Smoke report summary must be an object.");
  }

  assertSmokeReportSummaryCurrent(report);
}

function assertSmokeReportSummaryCurrent(report) {
  const expectedSummary = createSmokeReportSummary(report);

  if (JSON.stringify(report.summary) !== JSON.stringify(expectedSummary)) {
    throw new Error("Smoke report summary is stale.");
  }
}

function assertSmokeReportChecksWellFormed(checks) {
  for (const [index, check] of checks.entries()) {
    if (!isPlainRecord(check) || !smokeCheckStatuses.has(check.status)) {
      throw new Error(
        `Smoke report check at index ${index} must have status passed or failed.`,
      );
    }

    if (check.status === "passed" && !isIsoDateString(check.passedAt)) {
      throw new Error(
        `Smoke report passed check at index ${index} must include passedAt.`,
      );
    }

    if (check.status === "failed" && !isIsoDateString(check.failedAt)) {
      throw new Error(
        `Smoke report failed check at index ${index} must include failedAt.`,
      );
    }

    if (check.status === "failed" && !isFailureErrorRecord(check.error)) {
      throw new Error(
        `Smoke report failed check at index ${index} must include an error message.`,
      );
    }
  }
}

function isIsoDateString(value) {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isFailureErrorRecord(value) {
  return (
    isPlainRecord(value) &&
    typeof value.message === "string" &&
    value.message.length > 0
  );
}

function hasReportField(report, field) {
  return report && typeof report === "object" && field in report;
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
