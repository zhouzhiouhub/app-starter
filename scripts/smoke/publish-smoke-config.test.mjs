import assert from "node:assert/strict";
import test from "node:test";
import {
  isProductionSmokeEnvironment,
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
    normalizeAdminOrigin("https://admin.example.com/"),
    "https://admin.example.com",
  );
  assert.throws(
    () => normalizeAdminOrigin(" https://admin.example.com/ "),
    /ADMIN_URL must not include leading or trailing whitespace/,
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

test("smoke config includes default fallback context for revalidation targets", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_LOCALE: "de-DE",
      SMOKE_MARKET: "eu",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.fallbackLocale, "en-US");
      assert.equal(config.fallbackMarket, "us");
      assert.equal(config.locale, "de-DE");
      assert.equal(config.market, "eu");
    },
  );
});

test("smoke config records production smoke source metadata", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      GITHUB_REPOSITORY: "zhouzhiouhub/app-starter",
      GITHUB_RUN_ID: "123456789",
      GITHUB_RUN_NUMBER: "123",
      GITHUB_SHA: "0123456789abcdef0123456789abcdef01234567",
      GITHUB_WORKFLOW: "Production Smoke",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      const config = readConfig();

      assert.deepEqual(config.source, {
        commitSha: "0123456789abcdef0123456789abcdef01234567",
        repository: "zhouzhiouhub/app-starter",
        runId: "123456789",
        runNumber: "123",
        workflow: "Production Smoke",
        workflowRunUrl:
          "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
      });
    },
  );
});

test("smoke config derives expected CDN checks only from safe CDN bases", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      MEDIA_CDN_BASE_URL: "https://cdn.brand-assets.com/media",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.expectedMediaCdnHost, "cdn.brand-assets.com");
      assert.equal(config.expectedMediaCdnPathPrefix, "/media");
    },
  );

  for (const mediaCdnBaseUrl of [
    "https://cdn.brand-assets.com\t/media",
    "https://cdn.brand-assets.com/media?token=1",
    "https://cdn.example.com/media",
    "http://cdn.brand-assets.com/media",
  ]) {
    await withEnv(
      {
        API_URL: "https://api.example.com",
        MEDIA_CDN_BASE_URL: mediaCdnBaseUrl,
        WEB_URL: "https://web.example.com",
      },
      async () => {
        const config = readConfig();

        assert.equal(config.expectedMediaCdnHost, null);
        assert.equal(config.expectedMediaCdnPathPrefix, null);
      },
    );
  }
});

test("smoke config rejects documented local admin credentials in production", async () => {
  assert.equal(isProductionSmokeEnvironment({ APP_ENV: " production " }), true);
  assert.equal(
    isProductionSmokeEnvironment({ VERCEL_ENV: "production" }),
    true,
  );
  assert.equal(
    isProductionSmokeEnvironment({ NODE_ENV: "development" }),
    false,
  );

  await withEnv(
    {
      APP_ENV: "production",
      NODE_ENV: "",
      SEED_ADMIN_EMAIL: "",
      SEED_ADMIN_PASSWORD: "",
      SMOKE_ADMIN_EMAIL: "",
      SMOKE_ADMIN_PASSWORD: "",
      VERCEL_ENV: "",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_ADMIN_EMAIL must not use the documented local default/,
      );
    },
  );

  await withEnv(
    {
      APP_ENV: "",
      NODE_ENV: "production",
      SEED_ADMIN_EMAIL: "owner@example.com",
      SEED_ADMIN_PASSWORD: "ChangeMe123!",
      SMOKE_ADMIN_EMAIL: "",
      SMOKE_ADMIN_PASSWORD: "",
      VERCEL_ENV: "",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_ADMIN_PASSWORD must not use the documented local default/,
      );
    },
  );
});

test("smoke config validates login inputs before requests", async () => {
  for (const [name, value, expected] of [
    ["SMOKE_ADMIN_EMAIL", "owner", /SMOKE_ADMIN_EMAIL must be a valid email/],
    [
      "SMOKE_ADMIN_EMAIL",
      "owner@exa\rmple.com",
      /SMOKE_ADMIN_EMAIL must be a valid email/,
    ],
    [
      "SMOKE_ADMIN_PASSWORD",
      "short",
      /SMOKE_ADMIN_PASSWORD must be 8 to 128 characters/,
    ],
    [
      "SMOKE_ADMIN_PASSWORD",
      "a".repeat(129),
      /SMOKE_ADMIN_PASSWORD must be 8 to 128 characters/,
    ],
    [
      "SMOKE_ADMIN_PASSWORD",
      "valid-password\rinside",
      /SMOKE_ADMIN_PASSWORD must be 8 to 128 characters/,
    ],
    [
      "SMOKE_TENANT_SLUG",
      "Default",
      /SMOKE_TENANT_SLUG must be 1 to 100 lowercase/,
    ],
    [
      "SMOKE_TENANT_SLUG",
      "-default",
      /SMOKE_TENANT_SLUG must be 1 to 100 lowercase/,
    ],
  ]) {
    await withEnv(
      {
        API_URL: "https://api.example.com",
        SMOKE_ADMIN_EMAIL: "owner@example.com",
        SMOKE_ADMIN_PASSWORD: "valid-password",
        SMOKE_TENANT_SLUG: "default",
        WEB_URL: "https://web.example.com",
        [name]: value,
      },
      async () => {
        assert.throws(() => readConfig(), expected);
      },
    );
  }
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
