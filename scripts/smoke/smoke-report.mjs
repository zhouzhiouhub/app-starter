import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";
import {
  readSmokeErrorMessage,
  readSmokeFailureDetails,
} from "./smoke-report-errors.mjs";
import { smokeReportSchemaVersion } from "./smoke-report-contract.mjs";
import { refreshSmokeReportSummary } from "./smoke-report-summary.mjs";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import { redactSmokeReportValue } from "./smoke-secrets.mjs";

export { smokeReportSchemaVersion } from "./smoke-report-contract.mjs";
export {
  createSmokeReportSummary,
  refreshSmokeReportSummary,
} from "./smoke-report-summary.mjs";
export {
  assertSmokeReportWritable,
  writeSmokeReportIfConfigured,
} from "./smoke-report-writer.mjs";

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

  const report = {
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
    storefrontRequestUrl: null,
    storefrontUrl: null,
    summary: null,
    title,
  };

  refreshSmokeReportSummary(report);

  return report;
}

function createSmokeReportConfig(input) {
  return {
    adminUrl: input.adminUrl ?? null,
    apiBaseUrl: input.apiBaseUrl,
    locale: input.locale,
    market: input.market,
    reportPath: input.reportPath ?? null,
    requireAdminApp: input.requireAdminApp === true,
    requireR2Upload: input.requireR2Upload,
    requireRevalidation: input.requireRevalidation,
    storefrontHost: input.storefrontHost ?? null,
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
  refreshSmokeReportSummary(report);
}

export function recordSmokeCheckFailure(report, name, error, details = {}) {
  report.checks.push({
    details: redactSmokeReportValue(readSmokeFailureDetails(error, details)),
    error: {
      message: readSmokeErrorMessage(error),
    },
    failedAt: new Date().toISOString(),
    name,
    status: "failed",
  });
  refreshSmokeReportSummary(report);
}

export function completeSmokeReport(report, input) {
  report.finishedAt = new Date().toISOString();
  report.pageId = input.pageId;
  report.status = "passed";
  report.storefrontRequestUrl = input.storefrontRequestUrl ?? null;
  report.storefrontUrl = input.storefrontUrl;
  refreshSmokeReportSummary(report);
}

export function failSmokeReport(report, error) {
  report.error = {
    message: readSmokeErrorMessage(error),
  };
  report.finishedAt = new Date().toISOString();
  report.status = "failed";
  refreshSmokeReportSummary(report);
}
