export function createSmokeReadinessNextActions(blockers, warnings = []) {
  return dedupeActions([
    ...blockers.flatMap((blocker) => readBlockerActions(blocker)),
    ...warnings.flatMap((warning) => readWarningActions(warning)),
  ]);
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

  if (blocker.area === "database.url") {
    return [
      createAction(
        blocker.area,
        "Set DATABASE_URL to a production PostgreSQL connection URL outside local or placeholder hosts.",
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

  if (blocker.area === "analytics.enabled") {
    return [
      createAction(
        blocker.area,
        "Set ANALYTICS_ENABLED to true or false.",
      ),
    ];
  }

  if (blocker.area === "analytics.consent") {
    return [
      createAction(
        blocker.area,
        "Keep ANALYTICS_CONSENT_GRANTED=false until a consent mechanism or CMP grants analytics consent.",
      ),
    ];
  }

  if (blocker.area === "analytics.provider") {
    return [
      createAction(
        blocker.area,
        "Set a valid GTM_CONTAINER_ID, GA4_MEASUREMENT_ID, or CLARITY_PROJECT_ID, or set ANALYTICS_ENABLED=false.",
      ),
    ];
  }

  if (
    blocker.area === "feature-flags" ||
    (typeof blocker.area === "string" &&
      blocker.area.startsWith("feature-flags."))
  ) {
    return [
      createAction(
        blocker.area,
        blocker.variable
          ? `Set ${blocker.variable}=false in the API runtime before production smoke.`
          : "Set COMMERCE_ENABLED=false and MULTI_LOCALE_ENABLED=false in the API runtime before production smoke.",
      ),
    ];
  }

  if (
    blocker.area === "identity.jwt" ||
    (typeof blocker.area === "string" &&
      blocker.area.startsWith("identity.jwt."))
  ) {
    return [
      createAction(
        blocker.area,
        blocker.variable
          ? `Set ${blocker.variable} to a production PEM key in the API runtime.`
          : "Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY to production PEM keys in the API runtime.",
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

  if (blocker.area === "preview.secret") {
    return [
      createAction(
        blocker.area,
        "Set PREVIEW_TOKEN_SECRET in the API runtime before production smoke.",
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

  if (blocker.area === "report.path") {
    return [
      createAction(
        blocker.area,
        "Set SMOKE_REPORT_PATH to a relative JSON path under tmp/, reports/, artifacts/, or .tmp/.",
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
