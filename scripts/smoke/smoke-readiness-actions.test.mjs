import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness next actions preserve the public helper export", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions(
      [
        {
          area: "deployment.api",
          issue: "placeholder-host",
          message: "API_URL must be production ready.",
        },
        {
          area: "deployment.api",
          issue: "placeholder-host",
          message: "API_URL must be production ready.",
        },
      ],
      [
        {
          area: "revalidation.url",
          issue: "uses-web-url-fallback",
          message: "Uses WEB_URL fallback.",
        },
      ],
    ),
    [
      {
        action:
          "Replace placeholder API_URL hosts with the real production API endpoint.",
        area: "deployment.api",
      },
      {
        action:
          "Optionally set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint so API revalidation does not rely on WEB_URL fallback.",
        area: "revalidation.url",
      },
    ],
  );
});

test("smoke readiness next actions explain deployment URL blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "deployment.api",
        issue: "unexpected-path",
        message: "API_URL must be production ready.",
        variable: "API_URL",
      },
      {
        area: "deployment.web",
        issue: "unsupported-url-parts",
        message: "WEB_URL must be production ready.",
        variable: "WEB_URL",
      },
      {
        area: "deployment.admin",
        issue: "embedded-credentials",
        message: "ADMIN_URL must be production ready.",
        variable: "ADMIN_URL",
      },
    ]),
    [
      {
        action:
          "Set API_URL to the deployed API origin or exact /api/v1 base; remove any other path.",
        area: "deployment.api",
      },
      {
        action: "Remove query strings and fragments from WEB_URL.",
        area: "deployment.web",
      },
      {
        action: "Remove usernames and passwords from ADMIN_URL.",
        area: "deployment.admin",
      },
    ],
  );
});

test("smoke readiness next actions explain analytics readiness blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "analytics.enabled",
        issue: "invalid-boolean",
        message: "ANALYTICS_ENABLED must be true or false.",
        variable: "ANALYTICS_ENABLED",
      },
      {
        area: "analytics.consent",
        issue: "invalid-boolean",
        message: "ANALYTICS_CONSENT_GRANTED must be true or false.",
        variable: "ANALYTICS_CONSENT_GRANTED",
      },
      {
        area: "analytics.provider",
        issue: "missing-provider",
        message: "Enable analytics only with at least one valid provider ID.",
      },
      {
        area: "analytics.provider",
        issue: "invalid-provider",
        message: "GTM_CONTAINER_ID is not a valid analytics provider ID.",
        variable: "GTM_CONTAINER_ID",
      },
    ]),
    [
      {
        action:
          "Set ANALYTICS_ENABLED to a boolean value (true/false, 1/0, yes/no, or on/off).",
        area: "analytics.enabled",
      },
      {
        action:
          "Set ANALYTICS_CONSENT_GRANTED to a boolean value (true/false, 1/0, yes/no, or on/off).",
        area: "analytics.consent",
      },
      {
        action:
          "Configure at least one analytics provider ID: GTM_CONTAINER_ID, GA4_MEASUREMENT_ID, or CLARITY_PROJECT_ID; otherwise set ANALYTICS_ENABLED=false.",
        area: "analytics.provider",
      },
      {
        action:
          "Fix GTM_CONTAINER_ID to match GTM container ID such as GTM-XXXXXXX, or remove it and disable analytics.",
        area: "analytics.provider",
      },
    ],
  );
});

test("smoke readiness next actions explain analytics provider issue reasons", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "analytics.provider",
        issue: "invalid-provider",
        message: "GA4_MEASUREMENT_ID is not a valid analytics provider ID.",
        providerIssue: "control-character",
        variable: "GA4_MEASUREMENT_ID",
      },
      {
        area: "analytics.provider",
        issue: "invalid-provider",
        message: "GTM_CONTAINER_ID is not a valid analytics provider ID.",
        providerIssue: "surrounding-whitespace",
        variable: "GTM_CONTAINER_ID",
      },
      {
        area: "analytics.provider",
        issue: "invalid-provider",
        message: "CLARITY_PROJECT_ID is not a valid analytics provider ID.",
        providerIssue: "too-long",
        variable: "CLARITY_PROJECT_ID",
      },
    ]),
    [
      {
        action:
          "Remove control characters from GA4_MEASUREMENT_ID, or remove it and disable analytics.",
        area: "analytics.provider",
      },
      {
        action:
          "Remove leading and trailing whitespace from GTM_CONTAINER_ID, or remove it and disable analytics.",
        area: "analytics.provider",
      },
      {
        action:
          "Shorten CLARITY_PROJECT_ID to 64 characters or fewer, or remove it and disable analytics.",
        area: "analytics.provider",
      },
    ],
  );
});

test("smoke readiness next actions explain MVP feature flag blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "feature-flags.commerce",
        issue: "enabled",
        message: "COMMERCE_ENABLED must be explicitly set to false.",
        variable: "COMMERCE_ENABLED",
      },
      {
        area: "feature-flags.multi-locale",
        issue: "missing-env",
        message: "MULTI_LOCALE_ENABLED must be explicitly set to false.",
        variable: "MULTI_LOCALE_ENABLED",
      },
      {
        area: "feature-flags.commerce",
        issue: "invalid-boolean",
        message: "COMMERCE_ENABLED must be explicitly set to false.",
        variable: "COMMERCE_ENABLED",
      },
    ]),
    [
      {
        action:
          "Set COMMERCE_ENABLED=false in the API runtime before production smoke; MVP must not enable checkout, payment, or order creation flows.",
        area: "feature-flags.commerce",
      },
      {
        action:
          "Set MULTI_LOCALE_ENABLED=false explicitly in the API runtime; production smoke blocks missing MVP feature flag values.",
        area: "feature-flags.multi-locale",
      },
      {
        action:
          "Set COMMERCE_ENABLED=false using a valid boolean value (true/false, 1/0, yes/no, or on/off).",
        area: "feature-flags.commerce",
      },
    ],
  );
});

test("smoke readiness next actions explain Redis readiness blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "cache.redis",
        issue: "insecure-protocol",
        message: "REDIS_URL must point to a production TLS Redis endpoint.",
      },
    ]),
    [
      {
        action: "Use rediss:// for REDIS_URL; production Redis must use TLS.",
        area: "cache.redis",
      },
    ],
  );
});

test("smoke readiness next actions explain runtime secret and report blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "identity.jwt.private",
        issue: "invalid-pem",
        message: "JWT_PRIVATE_KEY must be valid.",
        variable: "JWT_PRIVATE_KEY",
      },
      {
        area: "preview.secret",
        issue: "short-secret",
        message: "PREVIEW_TOKEN_SECRET is too short.",
        variable: "PREVIEW_TOKEN_SECRET",
      },
      {
        area: "preview.previous-secret",
        issue: "control-character",
        message: "PREVIEW_TOKEN_PREVIOUS_SECRET is unsafe.",
        variable: "PREVIEW_TOKEN_PREVIOUS_SECRET",
      },
      {
        area: "revalidation.secret",
        issue: "oversized-secret",
        message: "STOREFRONT_REVALIDATE_SECRET is too long.",
        variable: "STOREFRONT_REVALIDATE_SECRET",
      },
      {
        area: "report.path",
        issue: "unsafe-root",
        message: "SMOKE_REPORT_PATH has an unsafe root.",
      },
    ]),
    [
      {
        action:
          "Fix JWT_PRIVATE_KEY PEM formatting, including BEGIN/END PRIVATE KEY lines and escaped \\n line breaks in env storage.",
        area: "identity.jwt.private",
      },
      {
        action:
          "Set PREVIEW_TOKEN_SECRET to a 32-1024 character production signing secret; current value is too short.",
        area: "preview.secret",
      },
      {
        action:
          "Remove PREVIEW_TOKEN_PREVIOUS_SECRET unless rotating preview secrets; if rotating, remove control characters and keep it 32-1024 characters.",
        area: "preview.previous-secret",
      },
      {
        action:
          "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes; keep it at 1024 characters or fewer.",
        area: "revalidation.secret",
      },
      {
        action:
          "Move SMOKE_REPORT_PATH under tmp/, reports/, artifacts/, or .tmp/.",
        area: "report.path",
      },
    ],
  );
});
