import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports media readiness without secrets", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
    MEDIA_EXTERNAL_URL_HOSTS: "images.example.com, https://assets.example.org",
    R2_ACCESS_KEY_ID: "access-key",
    R2_ACCOUNT_ID: "account-id",
    R2_BUCKET: "bucket-name",
    R2_REGION: "auto",
    R2_SECRET_ACCESS_KEY: "super-secret",
  });

  assert.deepEqual(diagnostics, {
    media: {
      cdnConfigured: true,
      cdnHost: "cdn.example.com",
      cdnUsesLocalFallback: false,
      externalUrlHosts: ["images.example.com", "assets.example.org"],
      r2: {
        configured: true,
        missingRequired: [],
        region: "auto",
      },
    },
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("super-secret"), false);
  assert.equal(serialized.includes("bucket-name"), false);
  assert.equal(serialized.includes("account-id"), false);
  assert.equal(serialized.includes("access-key"), false);
});

test("smoke environment diagnostics reports missing R2 and CDN fallback", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({});

  assert.deepEqual(diagnostics.media.r2.missingRequired, [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ]);
  assert.equal(diagnostics.media.r2.configured, false);
  assert.equal(diagnostics.media.cdnConfigured, false);
  assert.equal(diagnostics.media.cdnHost, "cdn.local.invalid");
  assert.equal(diagnostics.media.cdnUsesLocalFallback, true);
});
