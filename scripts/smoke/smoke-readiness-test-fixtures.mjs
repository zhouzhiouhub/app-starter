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
    media: {
      cdnConfigured: true,
      cdnProductionReady: true,
      r2: {
        configured: true,
        missingRequired: [],
      },
    },
    revalidation: {
      secretConfigured: true,
      urlConfigured: true,
      urlSafe: true,
      usesWebUrlFallback: false,
    },
  };
}
