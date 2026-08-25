import {
  readAnalyticsConsentAction,
  readAnalyticsEnabledAction,
  readAnalyticsProviderAction,
} from "./smoke-readiness-analytics-actions.mjs";
import {
  readCdnAction,
  readExternalHostsAction,
  readR2Action,
} from "./smoke-readiness-media-actions.mjs";
import { readFeatureFlagAction } from "./smoke-readiness-feature-flag-actions.mjs";
import {
  readJwtAction,
  readPreviewSecretAction,
  readReportPathAction,
  readRevalidationSecretAction,
} from "./smoke-readiness-runtime-actions.mjs";
import {
  readDatabaseUrlAction,
  readDeploymentAction,
  readRedisAction,
  readRevalidationUrlAction,
} from "./smoke-readiness-url-actions.mjs";

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
        readDeploymentAction(blocker),
      ),
    ];
  }

  if (blocker.area === "database.url") {
    return [
      createAction(
        blocker.area,
        readDatabaseUrlAction(blocker),
      ),
    ];
  }

  if (blocker.area === "database.migrations") {
    return [
      createAction(
        blocker.area,
        "Create and commit Prisma migration files, then run prisma migrate deploy in production.",
      ),
    ];
  }

  if (blocker.area === "cache.redis") {
    return [
      createAction(
        blocker.area,
        readRedisAction(blocker),
      ),
    ];
  }

  if (blocker.area === "deployment.web") {
    return [
      createAction(
        blocker.area,
        readDeploymentAction(blocker),
      ),
    ];
  }

  if (blocker.area === "deployment.admin") {
    return [
      createAction(
        blocker.area,
        readDeploymentAction(blocker),
      ),
    ];
  }

  if (blocker.area === "media.r2") {
    return [
      createAction(
        blocker.area,
        readR2Action(blocker),
      ),
    ];
  }

  if (blocker.area === "media.cdn") {
    return [
      createAction(
        blocker.area,
        readCdnAction(blocker),
      ),
    ];
  }

  if (blocker.area === "media.external-hosts") {
    return [
      createAction(
        blocker.area,
        readExternalHostsAction(blocker),
      ),
    ];
  }

  if (blocker.area === "analytics.enabled") {
    return [
      createAction(
        blocker.area,
        readAnalyticsEnabledAction(blocker),
      ),
    ];
  }

  if (blocker.area === "analytics.consent") {
    return [
      createAction(
        blocker.area,
        readAnalyticsConsentAction(blocker),
      ),
    ];
  }

  if (blocker.area === "analytics.provider") {
    return [
      createAction(
        blocker.area,
        readAnalyticsProviderAction(blocker),
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
        readFeatureFlagAction(blocker),
      ),
    ];
  }

  if (
    blocker.area === "identity.jwt" ||
    (typeof blocker.area === "string" &&
      blocker.area.startsWith("identity.jwt."))
  ) {
    if (blocker.area === "identity.jwt.pair") {
      return [
        createAction(
          blocker.area,
          readJwtAction(blocker),
        ),
      ];
    }

    return [
      createAction(
        blocker.area,
        readJwtAction(blocker),
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
        readPreviewSecretAction(blocker),
      ),
    ];
  }

  if (blocker.area === "preview.previous-secret") {
    return [
      createAction(
        blocker.area,
        readPreviewSecretAction(blocker),
      ),
    ];
  }

  if (blocker.area === "revalidation.secret") {
    return [
      createAction(
        blocker.area,
        readRevalidationSecretAction(blocker),
      ),
    ];
  }

  if (blocker.area === "revalidation.url") {
    return [
      createAction(
        blocker.area,
        readRevalidationUrlAction(blocker),
      ),
    ];
  }

  if (blocker.area === "report.path") {
    return [
      createAction(
        blocker.area,
        readReportPathAction(blocker),
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
