import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAdminOrigin,
  normalizeSmokeBoolean,
  normalizeSmokePositiveInt,
  readConfig,
} from "./publish-smoke-config.mjs";
import { withEnv } from "./smoke-test-env.mjs";

test("smoke config parses boolean flags from an explicit whitelist", () => {
  for (const value of ["1", "true", "TRUE", "yes", "on"]) {
    assert.equal(normalizeSmokeBoolean(value, "SMOKE_FLAG"), true);
  }

  for (const value of ["0", "false", "FALSE", "no", "off"]) {
    assert.equal(normalizeSmokeBoolean(value, "SMOKE_FLAG"), false);
  }

  assert.throws(
    () => normalizeSmokeBoolean("treu", "SMOKE_FLAG"),
    /SMOKE_FLAG must be true or false/,
  );
});

test("smoke config rejects misspelled boolean environment values", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_REVALIDATION: "treu",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REQUIRE_REVALIDATION must be true or false/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_ADMIN_APP: "enabled",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REQUIRE_ADMIN_APP must be true or false/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_R2_UPLOAD: "maybe",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REQUIRE_R2_UPLOAD must be true or false/,
      );
    },
  );
});

test("smoke config normalizes Admin app origin", async () => {
  assert.equal(
    normalizeAdminOrigin(" https://admin.example.com/ "),
    "https://admin.example.com",
  );
  assert.throws(
    () => normalizeAdminOrigin("https://admin.example.com/app"),
    /ADMIN_URL must be an admin origin without a path/,
  );
  assert.throws(
    () => normalizeAdminOrigin("https://user:secret@admin.example.com"),
    /ADMIN_URL must not include embedded credentials/,
  );

  await withEnv(
    {
      ADMIN_URL: "https://admin.example.com/app",
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_ADMIN_APP: "true",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /ADMIN_URL must be an admin origin without a path/,
      );
    },
  );
});

test("smoke config treats Admin URL as optional unless Admin smoke is required", async () => {
  await withEnv(
    {
      ADMIN_URL: "https://admin.example.com/app",
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_ADMIN_APP: "false",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.adminUrl, null);
      assert.equal(config.requireAdminApp, false);
    },
  );
});

test("smoke config validates positive integer retry settings", () => {
  assert.equal(
    normalizeSmokePositiveInt(" 8 ", "SMOKE_RETRY_ATTEMPTS", {
      max: 60,
      min: 1,
    }),
    8,
  );
  assert.throws(
    () =>
      normalizeSmokePositiveInt("1.5", "SMOKE_RETRY_ATTEMPTS", {
        max: 60,
        min: 1,
      }),
    /SMOKE_RETRY_ATTEMPTS must be a positive integer/,
  );
  assert.throws(
    () =>
      normalizeSmokePositiveInt("0", "SMOKE_RETRY_ATTEMPTS", {
        max: 60,
        min: 1,
      }),
    /SMOKE_RETRY_ATTEMPTS must be between 1 and 60/,
  );
  assert.throws(
    () =>
      normalizeSmokePositiveInt("61", "SMOKE_RETRY_ATTEMPTS", {
        max: 60,
        min: 1,
      }),
    /SMOKE_RETRY_ATTEMPTS must be between 1 and 60/,
  );
});

test("smoke config rejects invalid retry environment values", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_RETRY_ATTEMPTS: "many",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_RETRY_ATTEMPTS must be a positive integer/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_RETRY_DELAY_MS: "60001",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_RETRY_DELAY_MS must be between 1 and 60000/,
      );
    },
  );
});

test("smoke config rejects unsafe storefront host overrides", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_STOREFRONT_HOST: "store.example.com",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_STOREFRONT_HOST must be a safe storefront host/,
      );
    },
  );
});
