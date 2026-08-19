import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readApiErrorCode } from "./feature-flags-smoke.mjs";
import {
  createMediaSmokeDetails,
  isCdnUrlForR2Key,
  isMediaListResponseContainingAsset,
  isMediaReference,
  isProductionCdnUrl,
  isR2UploadUrl,
} from "./media-smoke.mjs";
import { getPreviewPath, isPreviewTokenShape } from "./preview-smoke.mjs";
import {
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  normalizeApiBaseUrl,
  parseSitemapUrls,
  readConfig,
} from "./publish-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";
import {
  completeSmokeReport,
  createSmokeReport,
  failSmokeReport,
  recordSmokeCheck,
  writeSmokeReportIfConfigured,
} from "./smoke-report.mjs";

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
    hasNoIndexRobots(
      '<meta content="noindex, nofollow" name="robots" />',
    ),
    true,
  );
  assert.equal(
    hasNoIndexRobots('<meta name="robots" content="index, follow" />'),
    false,
  );
  assert.equal(hasNoIndexRobots("<title>noindex copy</title>"), false);
});

test("smoke helpers read API error codes", () => {
  assert.equal(
    readApiErrorCode({
      error: {
        code: "COMMERCE_DISABLED",
      },
    }),
    "COMMERCE_DISABLED",
  );
  assert.equal(readApiErrorCode({ code: "MULTI_LOCALE_DISABLED" }), "MULTI_LOCALE_DISABLED");
  assert.equal(readApiErrorCode({}), null);
});

test("smoke helpers detect R2 upload URLs", () => {
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123",
    ),
    true,
  );
  assert.equal(
    isR2UploadUrl(
      "https://uploads.example.com/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(isR2UploadUrl("not-a-url"), false);
});

test("smoke helpers validate CDN URLs and media references", () => {
  assert.equal(
    isCdnUrlForR2Key(
      "https://cdn.example.com/tenant/2026/08/19/smoke.png",
      "tenant/2026/08/19/smoke.png",
    ),
    true,
  );
  assert.equal(
    isCdnUrlForR2Key(
      "https://cdn.example.com/tenant/2026/08/19/other.png",
      "tenant/2026/08/19/smoke.png",
    ),
    false,
  );
  assert.equal(isProductionCdnUrl("https://cdn.example.com/file.png"), true);
  assert.equal(isProductionCdnUrl("https://cdn.local.invalid/file.png"), false);
  assert.equal(
    isProductionCdnUrl("https://uploads.local.invalid/file.png"),
    false,
  );
  assert.equal(isMediaReference("media://asset_123"), true);
  assert.equal(isMediaReference("https://cdn.example.com/asset_123"), false);
});

test("smoke helpers validate media list filter responses", () => {
  const asset = {
    filename: "smoke.png",
    id: "asset-1",
    reference: "media://asset-1",
  };

  assert.equal(
    isMediaListResponseContainingAsset(
      {
        data: [
          {
            filename: "smoke.png",
            id: "asset-1",
            reference: "media://asset-1",
            status: "active",
            type: "image",
          },
        ],
      },
      asset,
    ),
    true,
  );
  assert.equal(
    isMediaListResponseContainingAsset(
      {
        data: [
          {
            filename: "smoke.png",
            id: "asset-1",
            reference: "media://asset-1",
            status: "archived",
            type: "image",
          },
        ],
      },
      asset,
    ),
    false,
  );
  assert.equal(isMediaListResponseContainingAsset({ data: [] }, asset), false);
});

test("smoke helpers summarize media checks without signed upload URLs", () => {
  const details = createMediaSmokeDetails(
    {
      uploadUrl:
        "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=secret",
    },
    {
      id: "asset-1",
      r2Key: "tenant/2026/08/19/smoke.png",
      reference: "media://asset-1",
      url: "https://cdn.example.com/tenant/2026/08/19/smoke.png",
    },
    true,
  );

  assert.deepEqual(details, {
    assetId: "asset-1",
    cdnHost: "cdn.example.com",
    isR2UploadUrl: true,
    productionCdn: true,
    r2Key: "tenant/2026/08/19/smoke.png",
    reference: "media://asset-1",
    uploadedObject: true,
  });
  assert.equal("uploadUrl" in details, false);
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
  assert.equal("password" in report.config, false);

  failSmokeReport(report, new Error("boom"));
  assert.equal(report.status, "failed");
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
