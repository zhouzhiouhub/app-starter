import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  redactSmokeReportValue,
  redactSmokeSecrets,
} from "./smoke-secrets.mjs";

export const smokeReportSchemaVersion = "smoke-report.v1";
const writableReportFields = [
  "checks",
  "config",
  "environment",
  "productionReadiness",
  "schemaVersion",
  "slug",
  "startedAt",
  "status",
  "title",
];

export function createSmokeReport(input, title, now = new Date()) {
  const config = createSmokeReportConfig(input);
  const environment =
    input.environmentDiagnostics ??
    createSmokeEnvironmentDiagnostics(process.env, {
      adminUrl: input.adminUrl,
      apiBaseUrl: input.apiBaseUrl,
      requireRevalidation: input.requireRevalidation,
      webUrl: input.webUrl,
    });

  return {
    checks: [],
    config,
    error: null,
    environment,
    finishedAt: null,
    pageId: null,
    productionReadiness: createSmokeProductionReadiness(environment, config),
    schemaVersion: smokeReportSchemaVersion,
    slug: input.slug,
    startedAt: now.toISOString(),
    status: "running",
    storefrontUrl: null,
    title,
  };
}

function createSmokeReportConfig(input) {
  return {
    adminUrl: input.adminUrl ?? null,
    apiBaseUrl: input.apiBaseUrl,
    locale: input.locale,
    market: input.market,
    requireAdminApp: input.requireAdminApp === true,
    requireR2Upload: input.requireR2Upload,
    requireRevalidation: input.requireRevalidation,
    tenantSlug: input.tenantSlug,
    webUrl: input.webUrl,
  };
}

export function recordSmokeCheck(report, name, details = {}) {
  report.checks.push({
    details: redactSmokeReportValue(details),
    name,
    passedAt: new Date().toISOString(),
    status: "passed",
  });
}

export function recordSmokeCheckFailure(report, name, error, details = {}) {
  report.checks.push({
    details: redactSmokeReportValue(readFailureDetails(error, details)),
    error: {
      message: readErrorMessage(error),
    },
    failedAt: new Date().toISOString(),
    name,
    status: "failed",
  });
}

export function completeSmokeReport(report, input) {
  report.finishedAt = new Date().toISOString();
  report.pageId = input.pageId;
  report.status = "passed";
  report.storefrontUrl = input.storefrontUrl;
}

export function failSmokeReport(report, error) {
  report.error = {
    message: readErrorMessage(error),
  };
  report.finishedAt = new Date().toISOString();
  report.status = "failed";
}

function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}

function readFailureDetails(error, details) {
  return {
    ...readErrorDetails(error),
    ...readPlainRecord(details),
  };
}

function readErrorDetails(error) {
  if (!error || typeof error !== "object") {
    return {};
  }

  return readPlainRecord(error.smokeDetails);
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function writeSmokeReportIfConfigured(input, report) {
  if (!input.reportPath) {
    return;
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

  if (!isPlainRecord(report.productionReadiness)) {
    throw new Error("Smoke report productionReadiness must be an object.");
  }
}

function hasReportField(report, field) {
  return report && typeof report === "object" && field in report;
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
