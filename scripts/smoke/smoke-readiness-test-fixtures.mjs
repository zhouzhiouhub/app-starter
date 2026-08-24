export function createReadyConfig() {
  return {
    reportPath: "tmp/smoke-report.json",
    requireAdminApp: true,
    requireR2Upload: true,
    requireRevalidation: true,
  };
}

export function createReadyEnvironment() {
  return {
    analytics: {
      productionReady: true,
    },
    database: {
      productionReady: true,
    },
    deployment: {
      admin: {
        productionReady: true,
      },
      api: {
        productionReady: true,
      },
      web: {
        productionReady: true,
      },
    },
    featureFlags: {
      productionReady: true,
    },
    identity: {
      jwt: {
        pair: {
          valid: true,
        },
        productionReady: true,
      },
    },
    media: {
      cdnConfigured: true,
      cdnProductionReady: true,
      r2: {
        configured: true,
        issues: [],
        missingRequired: [],
      },
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
