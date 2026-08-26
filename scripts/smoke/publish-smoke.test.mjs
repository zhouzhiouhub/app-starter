import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createSmokeStorefrontUrls,
  formatSmokeReportPageId,
  normalizeAdminOrigin,
  normalizeApiBaseUrl,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokeSlug,
  normalizeStorefrontHost,
  normalizeWebOrigin,
  readConfig,
  runSmokeTest,
} from "./publish-smoke.mjs";
import { withEnv } from "./smoke-test-env.mjs";

test("smoke helpers normalize API base URLs", () => {
  assert.equal(
    normalizeApiBaseUrl("http://localhost:4000"),
    "http://localhost:4000/api/v1",
  );
  assert.equal(
    normalizeApiBaseUrl("http://localhost:4000/api/v1/"),
    "http://localhost:4000/api/v1",
  );
});

test("smoke helpers validate slug locale and market config", async () => {
  assert.equal(normalizeSmokeSlug(" legal/terms "), "legal/terms");
  assert.equal(normalizeSmokeLocale(" en-US "), "en-US");
  assert.equal(normalizeSmokeMarket(" us "), "us");
  assert.equal(
    normalizeStorefrontHost(" Store.Brand-Platform.com:443 "),
    "store.brand-platform.com",
  );
  assert.throws(() => normalizeSmokeSlug("../secret"), /SMOKE_PAGE_SLUG/);
  assert.throws(() => normalizeSmokeSlug("Campaign"), /SMOKE_PAGE_SLUG/);
  assert.throws(() => normalizeSmokeLocale("bad_locale"), /SMOKE_LOCALE/);
  assert.throws(() => normalizeSmokeMarket("US"), /SMOKE_MARKET/);
  assert.throws(
    () => normalizeStorefrontHost("https://store.brand-platform.com"),
    /SMOKE_STOREFRONT_HOST/,
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_LOCALE: "english",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(() => readConfig(), /SMOKE_LOCALE/);
    },
  );
});

test("smoke helpers reject unsafe publish URLs", async () => {
  assert.throws(
    () => normalizeApiBaseUrl("https://api.example.com/internal"),
    /API_URL must be an origin URL or an \/api\/v1 base URL/,
  );
  assert.throws(
    () => normalizeApiBaseUrl("https://user:secret@api.example.com"),
    /API_URL must not include embedded credentials/,
  );
  assert.throws(
    () => normalizeApiBaseUrl("ftp://api.example.com"),
    /API_URL must use http or https/,
  );
  assert.throws(
    () => normalizeApiBaseUrl("https://api.example.com\t/api/v1"),
    /API_URL must not contain control characters/,
  );
  assert.throws(
    () => normalizeApiBaseUrl(" https://api.example.com/api/v1"),
    /API_URL must not include leading or trailing whitespace/,
  );
  assert.equal(
    normalizeWebOrigin("https://web.example.com/"),
    "https://web.example.com",
  );
  assert.equal(
    normalizeAdminOrigin("https://admin.example.com/"),
    "https://admin.example.com",
  );
  assert.throws(
    () => normalizeWebOrigin("https://web.example.com/storefront"),
    /WEB_URL must be a storefront origin without a path/,
  );
  assert.throws(
    () => normalizeWebOrigin("https://web.example.com?token=secret"),
    /WEB_URL must not include query strings or fragments/,
  );
  assert.throws(
    () => normalizeWebOrigin("https://web.example.com\n.evil.com"),
    /WEB_URL must not contain control characters/,
  );
  assert.throws(
    () => normalizeAdminOrigin("https://admin.example.com\t"),
    /ADMIN_URL must not contain control characters/,
  );
  assert.throws(
    () => normalizeWebOrigin("https://web.example.com "),
    /WEB_URL must not include leading or trailing whitespace/,
  );

  await withEnv(
    {
      API_URL: "https://api.example.com/api/v1?token=secret",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /API_URL must not include query strings or fragments/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com\t/api/v1",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /API_URL must not contain control characters/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      WEB_URL: "https://web.example.com\n.evil.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /WEB_URL must not contain control characters/,
      );
    },
  );

  await withEnv(
    {
      ADMIN_URL: "https://admin.example.com\t",
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_ADMIN_APP: "true",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /ADMIN_URL must not contain control characters/,
      );
    },
  );
});

test("readConfig uses seeded defaults and explicit smoke overrides", async () => {
  await withEnv(
    {
      ADMIN_URL: "https://admin.example.com/",
      API_URL: "http://api.example.com/api/v1/",
      MEDIA_CDN_BASE_URL: "https://cdn.brand-assets.com/media",
      SEED_ADMIN_EMAIL: "",
      SEED_ADMIN_PASSWORD: "",
      SMOKE_ADMIN_EMAIL: "owner@example.com",
      SMOKE_ADMIN_PASSWORD: "ChangeMe456!",
      SMOKE_PAGE_SLUG: "legal/terms",
      SMOKE_REQUIRE_ADMIN_APP: "true",
      SMOKE_REQUIRE_R2_UPLOAD: "true",
      SMOKE_REQUIRE_REVALIDATION: "false",
      SMOKE_REPORT_PATH: "tmp/smoke-report.json",
      SMOKE_STOREFRONT_HOST: "Store.Brand-Platform.com:443",
      SMOKE_TENANT_SLUG: "",
      WEB_URL: "https://web.example.com/",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.adminUrl, "https://admin.example.com");
      assert.equal(config.apiBaseUrl, "http://api.example.com/api/v1");
      assert.equal(config.email, "owner@example.com");
      assert.equal(config.expectedMediaCdnHost, "cdn.brand-assets.com");
      assert.equal(config.expectedMediaCdnPathPrefix, "/media");
      assert.equal(config.password, "ChangeMe456!");
      assert.equal(config.requireAdminApp, true);
      assert.equal(config.requireR2Upload, true);
      assert.equal(config.requireRevalidation, false);
      assert.equal(config.reportPath, "tmp/smoke-report.json");
      assert.equal(config.slug, "legal/terms");
      assert.equal(config.storefrontHost, "store.brand-platform.com");
      assert.equal(config.tenantSlug, "default");
      assert.equal(config.webUrl, "https://web.example.com");
    },
  );
});

test("smoke helpers distinguish request and public storefront URLs", () => {
  assert.deepEqual(
    createSmokeStorefrontUrls({
      locale: "en-US",
      slug: "smoke-page",
      webUrl: "https://web.example.com",
    }),
    {
      storefrontRequestUrl: "https://web.example.com/en/smoke-page",
      storefrontUrl: "https://web.example.com/en/smoke-page",
    },
  );

  assert.deepEqual(
    createSmokeStorefrontUrls({
      locale: "en-US",
      slug: "smoke-page",
      storefrontHost: "store.brand-platform.com",
      webUrl: "http://localhost:3000",
    }),
    {
      storefrontRequestUrl: "http://localhost:3000/en/smoke-page",
      storefrontUrl: "https://store.brand-platform.com/en/smoke-page",
    },
  );
});

test("smoke helpers bound page IDs before reporting", () => {
  const pageId = `page-1\nAuthorization Bearer header.payload.signature token=payload.signature ${"x".repeat(
    220,
  )}`;
  const reported = formatSmokeReportPageId(pageId);

  assert.equal(reported.length, 160);
  assert.equal(reported.endsWith("..."), true);
  assert.equal(reported.includes("\n"), false);
  assert.equal(reported.includes("payload.signature"), false);
  assert.match(reported, /Bearer \[redacted\]/);
  assert.match(reported, /token=\[redacted\]/);
});

test("failed publish smoke reports include storefront URLs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-publish-"));
  const previousFetch = globalThis.fetch;

  try {
    const reportPath = join(directory, "report.json");
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error: { message: "API temporarily unavailable" } }),
        {
          status: 503,
          statusText: "Service Unavailable",
        },
      );

    await assert.rejects(
      () =>
        runSmokeTest({
          apiBaseUrl: "https://api.example.com/api/v1",
          locale: "en-US",
          market: "us",
          reportPath,
          requireAdminApp: false,
          requireR2Upload: false,
          requireRevalidation: false,
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
          tenantSlug: "default",
          webUrl: "http://localhost:3000",
        }),
      /API health failed/,
    );

    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.status, "failed");
    assert.equal(
      report.storefrontRequestUrl,
      "http://localhost:3000/en/smoke-page",
    );
    assert.equal(
      report.storefrontUrl,
      "https://store.brand-platform.com/en/smoke-page",
    );
    assert.equal(report.summary.failedChecks[0], "api.health");
  } finally {
    globalThis.fetch = previousFetch;
    await rm(directory, { force: true, recursive: true });
  }
});
