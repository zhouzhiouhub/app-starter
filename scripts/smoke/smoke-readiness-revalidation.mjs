import { appendBlocker } from "./smoke-readiness-blockers.mjs";

export function collectRevalidationReadiness(
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

  collectRevalidationSecretReadiness(blockers, revalidation);
  collectRevalidationUrlReadiness(blockers, warnings, revalidation);
}

function collectRevalidationSecretReadiness(blockers, revalidation) {
  if (revalidation?.secretConfigured !== true) {
    appendBlocker(
      blockers,
      "revalidation.secret",
      "missing-secret",
      "Configure STOREFRONT_REVALIDATE_SECRET before production smoke.",
    );
    return;
  }

  if (revalidation.secretSafe === false) {
    appendBlocker(
      blockers,
      "revalidation.secret",
      revalidation.secretIssue ?? "unsafe-secret",
      "STOREFRONT_REVALIDATE_SECRET must be a safe bounded value before production smoke.",
      { variable: "STOREFRONT_REVALIDATE_SECRET" },
    );
  }
}

function collectRevalidationUrlReadiness(blockers, warnings, revalidation) {
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
      "Storefront revalidation URL must be a production HTTPS endpoint.",
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
