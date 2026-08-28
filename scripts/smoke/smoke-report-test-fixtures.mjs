import { createSmokeReport } from "./smoke-report.mjs";

const defaultSmokeReportInput = {
  apiBaseUrl: "https://api.example.com/api/v1",
  locale: "en-US",
  market: "us",
  requireR2Upload: false,
  requireRevalidation: true,
  slug: "smoke-page",
  tenantSlug: "default",
  webUrl: "https://web.example.com",
};

export function createTestSmokeReport(overrides = {}, options = {}) {
  return createSmokeReport(
    {
      ...defaultSmokeReportInput,
      ...overrides,
    },
    options.title ?? "Smoke Page",
    new Date(options.now ?? "2026-08-20T00:00:00.000Z"),
  );
}

export function createProductionReadySmokeReport(overrides = {}, options = {}) {
  return createTestSmokeReport(
    {
      adminUrl: "https://admin.brand.com",
      apiBaseUrl: "https://api.brand.com/api/v1",
      environmentDiagnostics: createProductionReadyEnvironmentDiagnostics(),
      requireAdminApp: true,
      requireR2Upload: true,
      reportPath: "tmp/smoke-report.json",
      source: createProductionReadySmokeSourceMetadata(),
      webUrl: "https://store.brand.com",
      ...overrides,
    },
    options,
  );
}

export function createProductionReadySmokeSourceMetadata() {
  return {
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    repository: "zhouzhiouhub/app-starter",
    runId: "123456789",
    runNumber: "123",
    workflow: "Production Smoke",
    workflowRunUrl:
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
  };
}

export function createProductionReadyEnvironmentDiagnostics() {
  return {
    analytics: {
      productionReady: true,
    },
    database: {
      productionReady: true,
    },
    deployment: {
      admin: { productionReady: true },
      api: { productionReady: true },
      web: { productionReady: true },
    },
    featureFlags: {
      productionReady: true,
    },
    identity: {
      jwt: {
        productionReady: true,
      },
    },
    media: {
      cdnConfigured: true,
      cdnProductionReady: true,
      r2: { configured: true, issues: [], missingRequired: [] },
    },
    preview: {
      secretConfigured: true,
    },
    redis: {
      productionReady: true,
    },
    revalidation: {
      secretConfigured: true,
      urlConfigured: true,
      urlSafe: true,
      usesWebUrlFallback: false,
    },
  };
}
