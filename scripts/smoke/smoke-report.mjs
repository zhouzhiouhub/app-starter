import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

export function createSmokeReport(input, title, now = new Date()) {
  return {
    checks: [],
    config: {
      apiBaseUrl: input.apiBaseUrl,
      locale: input.locale,
      market: input.market,
      requireR2Upload: input.requireR2Upload,
      requireRevalidation: input.requireRevalidation,
      tenantSlug: input.tenantSlug,
      webUrl: input.webUrl,
    },
    error: null,
    environment:
      input.environmentDiagnostics ??
      createSmokeEnvironmentDiagnostics(process.env, {
        requireRevalidation: input.requireRevalidation,
      }),
    finishedAt: null,
    pageId: null,
    slug: input.slug,
    startedAt: now.toISOString(),
    status: "running",
    storefrontUrl: null,
    title,
  };
}

export function recordSmokeCheck(report, name, details = {}) {
  report.checks.push({
    details,
    name,
    passedAt: new Date().toISOString(),
    status: "passed",
  });
}

export function recordSmokeCheckFailure(report, name, error, details = {}) {
  report.checks.push({
    details,
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
  return error instanceof Error ? error.message : String(error);
}

export async function writeSmokeReportIfConfigured(input, report) {
  if (!input.reportPath) {
    return;
  }

  await mkdir(dirname(input.reportPath), { recursive: true });
  await writeFile(
    input.reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(`Smoke report written: ${input.reportPath}`);
}
