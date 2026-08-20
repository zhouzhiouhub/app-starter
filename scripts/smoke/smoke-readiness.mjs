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

  return {
    blockers,
    nextActions: createSmokeReadinessNextActions(blockers, warnings),
    productionReady: blockers.length === 0,
    warnings,
  };
}

export function createSmokeReadinessNextActions(blockers, warnings = []) {
  return dedupeActions([
    ...blockers.flatMap((blocker) => readBlockerActions(blocker)),
    ...warnings.flatMap((warning) => readWarningActions(warning)),
  ]);
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

function readBlockerActions(blocker) {
  if (!blocker || typeof blocker !== "object") {
    return [];
  }

  if (blocker.area === "deployment.api") {
    return [
      createAction(
        blocker.area,
        "Set API_URL to the deployed API HTTPS origin or exact /api/v1 base.",
      ),
    ];
  }

  if (blocker.area === "deployment.web") {
    return [
      createAction(
        blocker.area,
        "Set WEB_URL to the deployed storefront HTTPS origin.",
      ),
    ];
  }

  if (blocker.area === "deployment.admin") {
    return [
      createAction(
        blocker.area,
        blocker.issue === "admin-smoke-not-required"
          ? "Set ADMIN_URL to the deployed Admin origin and SMOKE_REQUIRE_ADMIN_APP=true."
          : "Set ADMIN_URL to the deployed Admin HTTPS origin, then rerun with SMOKE_REQUIRE_ADMIN_APP=true.",
      ),
    ];
  }

  if (blocker.area === "media.r2") {
    return [
      createAction(
        blocker.area,
        blocker.issue === "r2-upload-smoke-not-required"
          ? "Configure R2 credentials and set SMOKE_REQUIRE_R2_UPLOAD=true."
          : `Set missing R2 variables${formatMissingList(blocker.missingRequired)}.`,
      ),
    ];
  }

  if (blocker.area === "media.cdn") {
    return [
      createAction(
        blocker.area,
        "Set MEDIA_CDN_BASE_URL to a production HTTPS CDN origin.",
      ),
    ];
  }

  if (blocker.area === "revalidation") {
    return [
      createAction(
        blocker.area,
        "Keep SMOKE_REQUIRE_REVALIDATION=true and configure storefront revalidation.",
      ),
    ];
  }

  if (blocker.area === "revalidation.secret") {
    return [
      createAction(
        blocker.area,
        "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.",
      ),
    ];
  }

  if (blocker.area === "revalidation.url") {
    return [
      createAction(
        blocker.area,
        "Set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint.",
      ),
    ];
  }

  return [createAction(blocker.area ?? "unknown", blocker.message)];
}

function readWarningActions(warning) {
  if (warning?.area === "revalidation.url") {
    return [
      createAction(
        warning.area,
        "Optionally set STOREFRONT_REVALIDATE_URL explicitly instead of relying on WEB_URL fallback.",
      ),
    ];
  }

  return [];
}

function createAction(area, action) {
  return { action, area };
}

function dedupeActions(actions) {
  const seen = new Set();
  const result = [];

  for (const action of actions) {
    const key = `${action.area}:${action.action}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(action);
    }
  }

  return result;
}

function formatMissingList(values) {
  return Array.isArray(values) && values.length > 0
    ? `: ${values.join(", ")}`
    : "";
}
