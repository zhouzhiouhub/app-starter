import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWebPreviewAttempt,
  getPreviewPath,
  isPreviewTokenShape,
  readWebPreviewAttempt,
} from "./preview-smoke.mjs";
import {
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  normalizeAdminOrigin,
  normalizeApiBaseUrl,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokeSlug,
  normalizeWebOrigin,
  parseSitemapUrls,
  formatPublishRevalidationFailure,
  readConfig,
} from "./publish-smoke.mjs";

test("smoke helpers preserve nested storefront slugs", () => {
  assert.equal(getStorefrontPath("en-US", "home"), "/en");
  assert.equal(getStorefrontPath("en-US", "legal/terms"), "/en/legal/terms");
  assert.equal(
    joinUrl("https://example.com", "/en/legal/terms"),
    "https://example.com/en/legal/terms",
  );
});

test("smoke helpers build preview paths safely", () => {
  assert.equal(getPreviewPath("abc.def"), "/preview?token=abc.def");
  assert.equal(getPreviewPath("a+b/c"), "/preview?token=a%2Bb%2Fc");
});

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
  assert.throws(() => normalizeSmokeSlug("../secret"), /SMOKE_PAGE_SLUG/);
  assert.throws(() => normalizeSmokeSlug("Campaign"), /SMOKE_PAGE_SLUG/);
  assert.throws(() => normalizeSmokeLocale("bad_locale"), /SMOKE_LOCALE/);
  assert.throws(() => normalizeSmokeMarket("US"), /SMOKE_MARKET/);

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
});

test("smoke helpers parse sitemap URLs", () => {
  assert.deepEqual(
    parseSitemapUrls(`<?xml version="1.0"?>
<urlset>
  <url><loc>https://web.example.com/en</loc></url>
  <url><loc>https://web.example.com/en/campaign</loc></url>
</urlset>`),
    ["https://web.example.com/en", "https://web.example.com/en/campaign"],
  );
});

test("smoke helpers detect noindex robots metadata", () => {
  assert.equal(
    hasNoIndexRobots('<meta content="noindex, nofollow" name="robots" />'),
    true,
  );
  assert.equal(
    hasNoIndexRobots('<meta name="robots" content="index, follow" />'),
    false,
  );
  assert.equal(hasNoIndexRobots("<title>noindex copy</title>"), false);
});

test("smoke helpers validate preview token responses", () => {
  assert.equal(
    isPreviewTokenShape(
      {
        expiresAt: "2026-08-19T10:00:00.000Z",
        slug: "smoke-page",
        token: "payload.signature",
      },
      "smoke-page",
    ),
    true,
  );
  assert.equal(
    isPreviewTokenShape(
      {
        expiresAt: "not-a-date",
        slug: "smoke-page",
        token: "payload.signature",
      },
      "smoke-page",
    ),
    false,
  );
  assert.equal(
    isPreviewTokenShape(
      {
        expiresAt: "2026-08-19T10:00:00.000Z",
        slug: "other-page",
        token: "payload.signature",
      },
      "smoke-page",
    ),
    false,
  );
});

test("smoke helpers format publish revalidation failures with diagnostics", () => {
  assert.equal(
    formatPublishRevalidationFailure(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: ["published-page"],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    [
      "Storefront revalidation was not triggered",
      "(diagnosis: revalidation-secret-mismatch,",
      "reason: request-failed,",
      "status: 401,",
      "paths: 1,",
      "tags: 1).",
    ].join(" "),
  );
});

test("smoke helpers summarize web preview attempts", () => {
  const passed = readWebPreviewAttempt(
    {
      ok: true,
      status: 200,
      statusText: "OK",
      text: '<html><head><meta name="robots" content="noindex" /></head><body>Draft title</body></html>',
    },
    "Draft title",
  );
  const failed = readWebPreviewAttempt(
    {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: "<html>\n  <body>Preview crashed while loading draft</body>\n</html>",
    },
    "Draft title",
  );

  assert.deepEqual(passed, {
    bodySnippet: null,
    noIndex: true,
    ok: true,
    status: 200,
    statusText: "OK",
    titlePresent: true,
  });
  assert.equal(
    failed.bodySnippet,
    "<html> <body>Preview crashed while loading draft</body> </html>",
  );
  assert.equal(
    formatWebPreviewAttempt(failed),
    'status 500 Internal Server Error, title present: false, noindex: false, body: "<html> <body>Preview crashed while loading draft</body> </html>"',
  );
});

test("readConfig uses seeded defaults and explicit smoke overrides", async () => {
  await withEnv(
    {
      ADMIN_URL: "https://admin.example.com/",
      API_URL: "http://api.example.com/api/v1/",
      SEED_ADMIN_EMAIL: "",
      SEED_ADMIN_PASSWORD: "",
      SMOKE_ADMIN_EMAIL: "owner@example.com",
      SMOKE_ADMIN_PASSWORD: "ChangeMe456!",
      SMOKE_PAGE_SLUG: "legal/terms",
      SMOKE_REQUIRE_ADMIN_APP: "true",
      SMOKE_REQUIRE_R2_UPLOAD: "true",
      SMOKE_REQUIRE_REVALIDATION: "false",
      SMOKE_REPORT_PATH: "tmp/smoke-report.json",
      SMOKE_TENANT_SLUG: "",
      WEB_URL: "https://web.example.com/",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.adminUrl, "https://admin.example.com");
      assert.equal(config.apiBaseUrl, "http://api.example.com/api/v1");
      assert.equal(config.email, "owner@example.com");
      assert.equal(config.password, "ChangeMe456!");
      assert.equal(config.requireAdminApp, true);
      assert.equal(config.requireR2Upload, true);
      assert.equal(config.requireRevalidation, false);
      assert.equal(config.reportPath, "tmp/smoke-report.json");
      assert.equal(config.slug, "legal/terms");
      assert.equal(config.tenantSlug, "default");
      assert.equal(config.webUrl, "https://web.example.com");
    },
  );
});

async function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
