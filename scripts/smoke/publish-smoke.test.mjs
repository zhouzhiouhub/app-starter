import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  normalizeApiBaseUrl,
  normalizeWebOrigin,
  parseSitemapUrls,
  readConfig,
} from "./publish-smoke.mjs";
import {
  formatStorefrontPageAttempt,
  readStorefrontPageAttempt,
} from "./storefront-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";
import {
  completeSmokeReport,
  createSmokeReport,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
  writeSmokeReportIfConfigured,
} from "./smoke-report.mjs";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

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

test("smoke helpers summarize storefront page attempts", () => {
  const failed = readStorefrontPageAttempt(
    {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: "<html>\n<body>Storefront render failed</body>\n</html>",
    },
    "Published title",
  );

  assert.deepEqual(failed, {
    bodySnippet: "<html> <body>Storefront render failed</body> </html>",
    ok: false,
    status: 503,
    statusText: "Service Unavailable",
    titlePresent: false,
  });
  assert.equal(
    formatStorefrontPageAttempt(failed),
    'status 503 Service Unavailable, title present: false, body: "<html> <body>Storefront render failed</body> </html>"',
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
      API_URL: "http://api.example.com/api/v1/",
      SEED_ADMIN_EMAIL: "",
      SEED_ADMIN_PASSWORD: "",
      SMOKE_ADMIN_EMAIL: "owner@example.com",
      SMOKE_ADMIN_PASSWORD: "ChangeMe456!",
      SMOKE_PAGE_SLUG: "legal/terms",
      SMOKE_REQUIRE_R2_UPLOAD: "true",
      SMOKE_REQUIRE_REVALIDATION: "false",
      SMOKE_REPORT_PATH: "tmp/smoke-report.json",
      SMOKE_TENANT_SLUG: "",
      WEB_URL: "https://web.example.com/",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.apiBaseUrl, "http://api.example.com/api/v1");
      assert.equal(config.email, "owner@example.com");
      assert.equal(config.password, "ChangeMe456!");
      assert.equal(config.requireR2Upload, true);
      assert.equal(config.requireRevalidation, false);
      assert.equal(config.reportPath, "tmp/smoke-report.json");
      assert.equal(config.slug, "legal/terms");
      assert.equal(config.tenantSlug, "default");
      assert.equal(config.webUrl, "https://web.example.com");
    },
  );
});

test("smoke report helpers capture pass and failure state without secrets", () => {
  const report = createSmokeReport(
    {
      apiBaseUrl: "https://api.example.com/api/v1",
      locale: "en-US",
      market: "us",
      password: "ChangeMe123!",
      requireR2Upload: true,
      requireRevalidation: false,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://web.example.com",
      environmentDiagnostics: createSmokeEnvironmentDiagnostics({}),
    },
    "Smoke Page",
    new Date("2026-08-19T00:00:00.000Z"),
  );

  recordSmokeCheck(report, "api.health");
  completeSmokeReport(report, {
    pageId: "page-1",
    storefrontUrl: "https://web.example.com/en/smoke-page",
  });

  assert.equal(report.status, "passed");
  assert.equal(report.startedAt, "2026-08-19T00:00:00.000Z");
  assert.equal(report.pageId, "page-1");
  assert.equal(report.checks[0].name, "api.health");
  assert.equal(report.environment.media.cdnHost, "cdn.local.invalid");
  assert.equal("password" in report.config, false);

  recordSmokeCheckFailure(
    report,
    "media.upload-target",
    new Error("R2 failed"),
  );
  failSmokeReport(report, new Error("boom"));
  assert.equal(report.status, "failed");
  assert.equal(report.checks[1].name, "media.upload-target");
  assert.equal(report.checks[1].status, "failed");
  assert.equal(report.checks[1].error.message, "R2 failed");
  assert.equal(report.error.message, "boom");
});

test("smoke report helper writes JSON when configured", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-"));

  try {
    const reportPath = join(directory, "report.json");
    const report = createSmokeReport(
      {
        apiBaseUrl: "https://api.example.com/api/v1",
        locale: "en-US",
        market: "us",
        requireR2Upload: false,
        requireRevalidation: true,
        slug: "smoke-page",
        tenantSlug: "default",
        webUrl: "https://web.example.com",
      },
      "Smoke Page",
      new Date("2026-08-19T00:00:00.000Z"),
    );

    await writeSmokeReportIfConfigured({ reportPath }, report);
    const written = JSON.parse(await readFile(reportPath, "utf8"));

    assert.equal(written.slug, "smoke-page");
    assert.equal(written.config.apiBaseUrl, "https://api.example.com/api/v1");
    assert.equal(written.environment.revalidation.requireRevalidation, true);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("buildSmokePageSchema returns a publishable landing schema", () => {
  const schema = buildSmokePageSchema({
    locale: "en-US",
    market: "us",
    slug: "smoke-page",
    title: "Smoke Page",
  });

  assert.equal(schema.version, "1.0");
  assert.equal(schema.meta.slug, "smoke-page");
  assert.equal(schema.meta.title, "Smoke Page");
  assert.equal(schema.template.id, "landing-blank");
  assert.equal(schema.chrome.header.enabled, false);
  assert.equal(schema.sections[0]?.component, "hero-banner");
  assert.equal(schema.sections[0]?.props.title.defaultValue, "Smoke Page");
  assert.equal(schema.seo.title, "Smoke Page");
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
