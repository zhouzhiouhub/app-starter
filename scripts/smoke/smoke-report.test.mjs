import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSmokeReportWritable,
  createSmokeReport,
  smokeReportSchemaVersion,
} from "./smoke-report.mjs";

test("smoke report schema version marks the summary contract", () => {
  assert.equal(smokeReportSchemaVersion, "smoke-report.v2");
});

test("smoke report includes deployment diagnostics for effective smoke URLs", () => {
  const report = createSmokeReport(
    {
      adminUrl: "https://admin.brand.com",
      apiBaseUrl: "https://api.brand.com/api/v1",
      locale: "en-US",
      market: "us",
      requireR2Upload: false,
      requireRevalidation: true,
      requireAdminApp: true,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://store.brand.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert.equal(report.config.adminUrl, "https://admin.brand.com");
  assert.equal(report.config.requireAdminApp, true);
  assert.equal(report.environment.deployment.admin.host, "admin.brand.com");
  assert.equal(report.environment.deployment.admin.productionReady, true);
  assert.equal(report.environment.deployment.api.host, "api.brand.com");
  assert.equal(report.environment.deployment.api.path, "/api/v1");
  assert.equal(report.environment.deployment.api.productionReady, true);
  assert.equal(report.environment.deployment.web.host, "store.brand.com");
  assert.equal(report.environment.deployment.web.productionReady, true);
});

test("smoke report includes production readiness summary", () => {
  const report = createSmokeReport(
    {
      adminUrl: "https://admin.brand.com",
      apiBaseUrl: "https://api.brand.com/api/v1",
      environmentDiagnostics: {
        deployment: {
          admin: { productionReady: true },
          api: { productionReady: true },
          web: { productionReady: true },
        },
        media: {
          cdnConfigured: true,
          cdnProductionReady: true,
          r2: { configured: true, missingRequired: [] },
        },
        revalidation: {
          secretConfigured: true,
          urlConfigured: true,
          urlSafe: true,
          usesWebUrlFallback: false,
        },
      },
      locale: "en-US",
      market: "us",
      requireAdminApp: true,
      requireR2Upload: true,
      requireRevalidation: true,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://store.brand.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert.deepEqual(report.productionReadiness, {
    blockers: [],
    nextActions: [],
    productionReady: true,
    warnings: [],
  });
});

test("smoke report validates required fields before writing", () => {
  const report = createSmokeReport(
    {
      apiBaseUrl: "https://api.example.com/api/v1",
      locale: "en-US",
      market: "us",
      requireR2Upload: false,
      requireRevalidation: true,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://web.example.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert.doesNotThrow(() => assertSmokeReportWritable(report));
  assert.throws(
    () =>
      assertSmokeReportWritable({
        checks: [],
        schemaVersion: smokeReportSchemaVersion,
      }),
    /config, environment, productionReadiness, slug, startedAt, status, summary, title/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: {},
      }),
    /checks must be an array/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: [{ name: "api.health", status: "skipped" }],
      }),
    /check at index 0 must have status passed or failed/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        checks: ["api.health"],
      }),
    /check at index 0 must have status passed or failed/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        productionReadiness: [],
      }),
    /productionReadiness must be an object/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        summary: [],
      }),
    /summary must be an object/,
  );
  assert.throws(
    () =>
      assertSmokeReportWritable({
        ...report,
        summary: {
          ...report.summary,
          checkCount: 99,
        },
      }),
    /summary is stale/,
  );
});
