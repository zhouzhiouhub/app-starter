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
