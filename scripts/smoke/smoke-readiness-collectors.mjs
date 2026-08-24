import {
  appendBlocker,
  appendDisabledFeatureFlagBlocker,
  appendJwtKeyBlocker,
  appendUrlBlocker,
} from "./smoke-readiness-blockers.mjs";
import { collectDatabaseReadiness } from "./smoke-readiness-database.mjs";
import { collectRedisReadiness } from "./smoke-readiness-redis.mjs";
import { collectRevalidationReadiness } from "./smoke-readiness-revalidation.mjs";

export function collectSmokeReadinessFindings(environment, config) {
  const blockers = [];
  const warnings = [];

  collectAnalyticsReadiness(blockers, environment.analytics);
  collectDatabaseReadiness(blockers, environment.database);
  collectDeploymentReadiness(blockers, environment.deployment, config);
  collectFeatureFlagReadiness(blockers, environment.featureFlags);
  collectIdentityReadiness(blockers, environment.identity);
  collectMediaReadiness(blockers, environment.media, config);
  collectPreviewReadiness(blockers, environment.preview);
  collectRedisReadiness(blockers, environment.redis);
  collectRevalidationReadiness(
    blockers,
    warnings,
    environment.revalidation,
    config,
  );
  collectReportReadiness(blockers, config);

  return { blockers, warnings };
}

function collectAnalyticsReadiness(blockers, analytics) {
  if (analytics?.productionReady === true) {
    return;
  }

  if (!analytics || typeof analytics !== "object" || Array.isArray(analytics)) {
    appendBlocker(
      blockers,
      "analytics",
      "missing-diagnostics",
      "Collect analytics diagnostics before production smoke.",
    );
    return;
  }

  if (analytics.enabled?.issue) {
    appendBlocker(
      blockers,
      "analytics.enabled",
      analytics.enabled.issue,
      "ANALYTICS_ENABLED must be true or false.",
      { variable: "ANALYTICS_ENABLED" },
    );
  }

  if (analytics.consent?.issue) {
    appendBlocker(
      blockers,
      "analytics.consent",
      analytics.consent.issue,
      "ANALYTICS_CONSENT_GRANTED must be true or false.",
      { variable: "ANALYTICS_CONSENT_GRANTED" },
    );
  }

  if (analytics.enabled?.value !== true) {
    return;
  }

  if (analytics.consent?.value !== true && !analytics.consent?.issue) {
    appendBlocker(
      blockers,
      "analytics.consent",
      "missing-consent",
      "Analytics must stay disabled until consent is configured.",
      { variable: "ANALYTICS_CONSENT_GRANTED" },
    );
  }

  if (analytics.providerConfigured !== true) {
    appendBlocker(
      blockers,
      "analytics.provider",
      "missing-provider",
      "Enable analytics only with at least one valid provider ID.",
    );
  }

  for (const provider of analytics.invalidProviders ?? []) {
    appendBlocker(
      blockers,
      "analytics.provider",
      "invalid-provider",
      `${provider} is not a valid analytics provider ID.`,
      { variable: provider },
    );
  }
}

function collectIdentityReadiness(blockers, identity) {
  if (identity?.jwt?.productionReady === true) {
    return;
  }

  const jwt = identity?.jwt;

  if (!jwt || typeof jwt !== "object" || Array.isArray(jwt)) {
    appendBlocker(
      blockers,
      "identity.jwt",
      "missing-diagnostics",
      "Collect JWT key diagnostics before production smoke.",
    );
    return;
  }

  appendJwtKeyBlocker(blockers, {
    area: "identity.jwt.private",
    diagnostic: jwt.privateKey,
    variable: "JWT_PRIVATE_KEY",
  });
  appendJwtKeyBlocker(blockers, {
    area: "identity.jwt.public",
    diagnostic: jwt.publicKey,
    variable: "JWT_PUBLIC_KEY",
  });
}

function collectFeatureFlagReadiness(blockers, featureFlags) {
  if (featureFlags?.productionReady === true) {
    return;
  }

  const flags = featureFlags?.flags;

  if (!flags || typeof flags !== "object" || Array.isArray(flags)) {
    appendBlocker(
      blockers,
      "feature-flags",
      "missing-diagnostics",
      "Collect MVP feature flag diagnostics before production smoke.",
    );
    return;
  }

  appendDisabledFeatureFlagBlocker(blockers, flags, {
    area: "feature-flags.commerce",
    name: "COMMERCE_ENABLED",
  });
  appendDisabledFeatureFlagBlocker(blockers, flags, {
    area: "feature-flags.multi-locale",
    name: "MULTI_LOCALE_ENABLED",
  });
}

function collectPreviewReadiness(blockers, preview) {
  if (preview?.secretConfigured !== true) {
    appendBlocker(
      blockers,
      "preview.secret",
      "missing-secret",
      "Configure PREVIEW_TOKEN_SECRET before production smoke.",
    );
  } else if (preview?.secretSafe === false) {
    appendBlocker(
      blockers,
      "preview.secret",
      preview.secretIssue ?? "unsafe-secret",
      "PREVIEW_TOKEN_SECRET must be a production-safe signing secret.",
      { variable: "PREVIEW_TOKEN_SECRET" },
    );
  }

  if (
    preview?.previousSecretConfigured === true &&
    preview.previousSecretSafe === false
  ) {
    appendBlocker(
      blockers,
      "preview.previous-secret",
      preview.previousSecretIssue ?? "unsafe-secret",
      "PREVIEW_TOKEN_PREVIOUS_SECRET must be production-safe when configured.",
      { variable: "PREVIEW_TOKEN_PREVIOUS_SECRET" },
    );
  }
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
  if (media?.externalUrlHostIssues?.length > 0) {
    appendBlocker(
      blockers,
      "media.external-hosts",
      "unsafe-hosts",
      "MEDIA_EXTERNAL_URL_HOSTS must contain production-safe hostnames or HTTPS origins.",
      { issues: media.externalUrlHostIssues },
    );
  }

  if (config.requireR2Upload !== true) {
    appendBlocker(
      blockers,
      "media.r2",
      "r2-upload-smoke-not-required",
      "Set SMOKE_REQUIRE_R2_UPLOAD=true to prove R2 upload and CDN delivery.",
    );
  } else {
    const missingRequired = media?.r2?.missingRequired ?? [];
    const issues = media?.r2?.issues ?? [];

    if (missingRequired.length > 0) {
      appendBlocker(
        blockers,
        "media.r2",
        "missing-required-env",
        "Configure all required R2 variables before production smoke.",
        { missingRequired },
      );
    }

    if (issues.length > 0) {
      appendBlocker(
        blockers,
        "media.r2",
        "invalid-config",
        "R2 upload configuration contains invalid production values.",
        { issues },
      );
    }

    if (
      media?.r2?.configured !== true &&
      missingRequired.length === 0 &&
      issues.length === 0
    ) {
      appendBlocker(
        blockers,
        "media.r2",
        "r2-not-production-ready",
        "R2 upload configuration must be production-ready before smoke.",
      );
    }
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
