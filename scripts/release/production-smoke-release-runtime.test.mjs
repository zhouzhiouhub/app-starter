import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionSmokeReleaseInputs } from "./production-smoke-release-inputs.mjs";
import { validateProductionSmokeRuntimeInputs } from "./production-smoke-release-runtime.mjs";

test("production smoke runtime input preflight accepts optional smoke run inputs", () => {
  assert.equal(
    validateProductionSmokeRuntimeInputs({
      SMOKE_LOCALE: " de-DE ",
      SMOKE_MARKET: " eu ",
      SMOKE_PAGE_SLUG: " campaign/launch-2026 ",
      SMOKE_ADMIN_EMAIL: " owner@brand-platform.com ",
      SMOKE_ADMIN_PASSWORD: " valid-password ",
      SMOKE_TENANT_SLUG: " brand-store ",
      SMOKE_REQUIRE_ADMIN_APP: "true",
      SMOKE_REQUIRE_R2_UPLOAD: "false",
      SMOKE_REQUIRE_REVALIDATION: "yes",
      SMOKE_RETRY_ATTEMPTS: " 12 ",
      SMOKE_RETRY_DELAY_MS: " 2500 ",
      SMOKE_STOREFRONT_HOST: " Store.Brand-Platform.com:443 ",
    }),
    undefined,
  );
});

test("production smoke release input preflight rejects invalid smoke admin email overrides", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_ADMIN_EMAIL: "owner",
      }),
    /SMOKE_ADMIN_EMAIL must be a valid email/,
  );
});

test("production smoke release input preflight rejects invalid smoke admin password overrides", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_ADMIN_PASSWORD: "short",
      }),
    /SMOKE_ADMIN_PASSWORD must be 8 to 128 characters/,
  );
});

test("production smoke release input preflight rejects invalid tenant slug overrides", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_TENANT_SLUG: "-default",
      }),
    /SMOKE_TENANT_SLUG must be 1 to 100 lowercase/,
  );
});

test("production smoke release input preflight rejects invalid locale overrides", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_LOCALE: "english",
      }),
    /SMOKE_LOCALE must look like en-US/,
  );
});

test("production smoke release input preflight rejects invalid market overrides", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_MARKET: "US",
      }),
    /SMOKE_MARKET must be a lowercase market code/,
  );
});

test("production smoke release input preflight rejects unsafe page slugs", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_PAGE_SLUG: "../admin",
      }),
    /SMOKE_PAGE_SLUG must use lowercase letters, numbers, hyphens, or slashes/,
  );
});

test("production smoke release input preflight rejects invalid retry attempts", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_RETRY_ATTEMPTS: "0",
      }),
    /SMOKE_RETRY_ATTEMPTS must be between 1 and 60/,
  );
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_RETRY_ATTEMPTS: "many",
      }),
    /SMOKE_RETRY_ATTEMPTS must be a positive integer/,
  );
});

test("production smoke release input preflight rejects invalid retry delays", () => {
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        SMOKE_RETRY_DELAY_MS: "60001",
      }),
    /SMOKE_RETRY_DELAY_MS must be between 1 and 60000/,
  );
});
