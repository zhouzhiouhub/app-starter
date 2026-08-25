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
          "Optionally set STOREFRONT_REVALIDATE_URL explicitly instead of relying on WEB_URL fallback.",
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

test("smoke readiness next actions explain CDN readiness blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "media.cdn",
        issue: "cdn-not-configured",
        message: "Configure MEDIA_CDN_BASE_URL before production smoke.",
      },
      {
        area: "media.cdn",
        issue: "unsupported-protocol",
        message: "MEDIA_CDN_BASE_URL must use HTTPS.",
      },
      {
        area: "media.cdn",
        issue: "unsupported-url-parts",
        message: "MEDIA_CDN_BASE_URL must not include query strings.",
      },
      {
        area: "media.cdn",
        issue: "placeholder-host",
        message: "MEDIA_CDN_BASE_URL must not use placeholder hosts.",
      },
    ]),
    [
      {
        action:
          "Set MEDIA_CDN_BASE_URL to the production HTTPS CDN URL used for published media.",
        area: "media.cdn",
      },
      {
        action:
          "Use an https:// MEDIA_CDN_BASE_URL; production media CDN URLs cannot use http://.",
        area: "media.cdn",
      },
      {
        action:
          "Remove query strings and fragments from MEDIA_CDN_BASE_URL; keep only the HTTPS CDN origin or path prefix.",
        area: "media.cdn",
      },
      {
        action:
          "Replace placeholder MEDIA_CDN_BASE_URL hosts with the real production HTTPS CDN host.",
        area: "media.cdn",
      },
    ],
  );
});

test("smoke readiness next actions explain R2 readiness blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "media.r2",
        issue: "invalid-config",
        issues: [
          {
            issue: "invalid-account-id",
            variable: "R2_ACCOUNT_ID",
          },
          {
            issue: "invalid-bucket",
            variable: "R2_BUCKET",
          },
          {
            issue: "invalid-credential",
            variable: "R2_SECRET_ACCESS_KEY",
          },
          {
            issue: "invalid-region",
            variable: "R2_REGION",
          },
        ],
        message: "R2 upload configuration contains invalid production values.",
      },
    ]),
    [
      {
        action:
          "Fix invalid R2 variables: R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters; R2_BUCKET must be 3-63 characters using letters, numbers, dots, or hyphens; R2_SECRET_ACCESS_KEY must not contain whitespace or control characters; R2_REGION must be a DNS-safe region label such as auto.",
        area: "media.r2",
      },
    ],
  );
});
