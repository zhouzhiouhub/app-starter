import { createSmokeReadinessNextActions } from "./smoke-readiness-actions.mjs";

export { createSmokeReadinessNextActions } from "./smoke-readiness-actions.mjs";

export function createSmokeProductionReadiness(environment, config) {
  const blockers = [];
  const warnings = [];

  collectDeploymentReadiness(blockers, environment.deployment, config);
  collectMediaReadiness(blockers, environment.media, config);
  collectRevalidationReadiness(
    blockers,
    warnings,
    environment.revalidation,
    config,
  );
  collectReportReadiness(blockers, config);

  return {
    blockers,
    nextActions: createSmokeReadinessNextActions(blockers, warnings),
    productionReady: blockers.length === 0,
    warnings,
  };
}

function collectReportReadiness(blockers, config) {
  if (typeof config.reportPath === "string" && config.reportPath.length > 0) {
    return;
  }

  appendBlocker(
    blockers,
    "report.path",
    "report-path-not-configured",
    "Set SMOKE_REPORT_PATH to archive a machine-readable production smoke report.",
  );
}

function collectDeploymentReadiness(blockers, deployment, config) {
  appendUrlBlocker(blockers, "deployment.api", deployment?.api);
  appendUrlBlocker(blockers, "deployment.web", deployment?.web);

  if (config.requireAdminApp !== true) {
    appendBlocker(
      blockers,
      "deployment.admin",
      "admin-smoke-not-required",
      "Set SMOKE_REQUIRE_ADMIN_APP=true to prove the Admin static app deployment.",
    );
    return;
  }

  appendUrlBlocker(blockers, "deployment.admin", deployment?.admin);
}

function collectMediaReadiness(blockers, media, config) {
  if (config.requireR2Upload !== true) {
    appendBlocker(
      blockers,
      "media.r2",
      "r2-upload-smoke-not-required",
      "Set SMOKE_REQUIRE_R2_UPLOAD=true to prove R2 upload and CDN delivery.",
    );
    return;
  }

  if (media?.r2?.configured !== true) {
    appendBlocker(
      blockers,
      "media.r2",
      "missing-required-env",
      "Configure all required R2 variables before production smoke.",
      { missingRequired: media?.r2?.missingRequired ?? [] },
    );
  }

  if (media?.cdnConfigured !== true) {
    appendBlocker(
      blockers,
      "media.cdn",
      "cdn-not-configured",
      "Configure MEDIA_CDN_BASE_URL before production smoke.",
    );
  } else if (media?.cdnProductionReady !== true) {
    appendBlocker(
      blockers,
      "media.cdn",
      media?.cdnUrlIssue ?? "cdn-not-production-ready",
      "MEDIA_CDN_BASE_URL must be a production HTTPS CDN origin.",
    );
  }
}

function collectRevalidationReadiness(
  blockers,
  warnings,
  revalidation,
  config,
) {
  if (config.requireRevalidation !== true) {
    appendBlocker(
      blockers,
      "revalidation",
      "revalidation-smoke-not-required",
      "Set SMOKE_REQUIRE_REVALIDATION=true to prove storefront ISR refresh.",
    );
    return;
  }

  if (revalidation?.secretConfigured !== true) {
    appendBlocker(
      blockers,
      "revalidation.secret",
      "missing-secret",
      "Configure STOREFRONT_REVALIDATE_SECRET before production smoke.",
    );
  }

  if (revalidation?.urlConfigured !== true) {
    appendBlocker(
      blockers,
      "revalidation.url",
      "missing-url",
      "Configure STOREFRONT_REVALIDATE_URL or WEB_URL before production smoke.",
    );
  } else if (revalidation?.urlSafe !== true) {
    appendBlocker(
      blockers,
      "revalidation.url",
      revalidation?.urlIssue ?? "unsafe-url",
      "Storefront revalidation URL must be a safe HTTP(S) endpoint.",
    );
  }

  if (revalidation?.usesWebUrlFallback === true) {
    warnings.push({
      area: "revalidation.url",
      issue: "uses-web-url-fallback",
      message:
        "STOREFRONT_REVALIDATE_URL is not set; smoke will derive /api/revalidate from WEB_URL.",
    });
  }
}

function appendUrlBlocker(blockers, area, diagnostics) {
  if (diagnostics?.productionReady === true) {
    return;
  }

  appendBlocker(
    blockers,
    area,
    diagnostics?.urlIssue ?? "missing-url",
    `${diagnostics?.variable ?? area} must be a production HTTPS URL.`,
    {
      host: diagnostics?.host ?? null,
      path: diagnostics?.path ?? null,
      variable: diagnostics?.variable ?? null,
    },
  );
}

function appendBlocker(blockers, area, issue, message, extra = {}) {
  blockers.push({
    area,
    issue,
    message,
    ...extra,
  });
}
