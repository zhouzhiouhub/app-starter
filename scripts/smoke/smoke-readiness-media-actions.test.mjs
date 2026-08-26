import assert from "node:assert/strict";
import test from "node:test";
import {
  readCdnAction,
  readExternalHostsAction,
} from "./smoke-readiness-media-actions.mjs";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness media actions explain control-character CDN blockers", () => {
  assert.equal(
    readCdnAction({
      area: "media.cdn",
      issue: "control-character",
    }),
    "Remove control characters from MEDIA_CDN_BASE_URL, including percent-encoded controls in the path.",
  );
});

test("smoke readiness media actions explain control-character external host blockers", () => {
  assert.equal(
    readExternalHostsAction({
      issues: [
        {
          host: null,
          issue: "control-character",
        },
      ],
    }),
    "Fix MEDIA_EXTERNAL_URL_HOSTS: remove control characters from one entry.",
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
        issue: "file-path",
        message: "MEDIA_CDN_BASE_URL must not point at a file.",
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
          "Replace file-like MEDIA_CDN_BASE_URL paths with the CDN origin or a directory prefix such as /media.",
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
        issue: "r2-upload-smoke-not-required",
        message: "Set SMOKE_REQUIRE_R2_UPLOAD=true.",
      },
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
          "Set SMOKE_REQUIRE_R2_UPLOAD=true after configuring R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_REGION, and production MEDIA_CDN_BASE_URL so smoke proves presigned URL creation, actual PUT upload, and CDN delivery.",
        area: "media.r2",
      },
      {
        action:
          "Fix invalid R2 variables: R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters; R2_BUCKET must be 3-63 characters using lowercase letters, numbers, dots, or hyphens, without adjacent dot/hyphen pairs or IP address format; R2_SECRET_ACCESS_KEY must not contain whitespace or control characters; R2_REGION must be a DNS-safe region label such as auto.",
        area: "media.r2",
      },
    ],
  );
});

test("smoke readiness next actions explain external media host blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "media.external-hosts",
        issue: "unsafe-hosts",
        issues: [
          {
            host: "assets.brand.com",
            issue: "unsupported-protocol",
          },
          {
            host: "cdn.example.com",
            issue: "placeholder-host",
          },
          {
            host: null,
            issue: "invalid-host",
          },
          {
            host: "media.brand.com",
            issue: "unsupported-url-parts",
          },
        ],
        message:
          "MEDIA_EXTERNAL_URL_HOSTS must contain production-safe hostnames or HTTPS origins.",
      },
    ]),
    [
      {
        action:
          "Fix MEDIA_EXTERNAL_URL_HOSTS: assets.brand.com must use https:// or be listed as a bare hostname; replace placeholder host cdn.example.com with the real production media host; replace one hostname entry with a valid production hostname; remove paths, query strings, and fragments from media.brand.com.",
        area: "media.external-hosts",
      },
    ],
  );
});
