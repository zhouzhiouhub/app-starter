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
      webUrl: "https://store.brand.com",
      ...overrides,
    },
    options,
  );
}

export function createProductionReadyEnvironmentDiagnostics() {
  return {
    analytics: {
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
      r2: { configured: true, missingRequired: [] },
    },
    preview: {
      secretConfigured: true,
    },
    revalidation: {
      secretConfigured: true,
      urlConfigured: true,
      urlSafe: true,
      usesWebUrlFallback: false,
    },
  };
}
