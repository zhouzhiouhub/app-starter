import assert from "node:assert/strict";
import test from "node:test";
import {
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  normalizeApiBaseUrl,
  parseSitemapUrls,
  readConfig,
} from "./publish-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";

test("smoke helpers preserve nested storefront slugs", () => {
  assert.equal(getStorefrontPath("en-US", "home"), "/en");
  assert.equal(getStorefrontPath("en-US", "legal/terms"), "/en/legal/terms");
  assert.equal(
    joinUrl("https://example.com", "/en/legal/terms"),
    "https://example.com/en/legal/terms",
  );
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

test("readConfig uses seeded defaults and explicit smoke overrides", async () => {
  await withEnv(
    {
      API_URL: "http://api.example.com/api/v1/",
      SEED_ADMIN_EMAIL: "",
      SEED_ADMIN_PASSWORD: "",
      SMOKE_ADMIN_EMAIL: "owner@example.com",
      SMOKE_ADMIN_PASSWORD: "ChangeMe456!",
      SMOKE_PAGE_SLUG: "legal/terms",
      SMOKE_REQUIRE_REVALIDATION: "false",
      SMOKE_TENANT_SLUG: "",
      WEB_URL: "https://web.example.com/",
    },
    async () => {
      const config = readConfig();

      assert.equal(config.apiBaseUrl, "http://api.example.com/api/v1");
      assert.equal(config.email, "owner@example.com");
      assert.equal(config.password, "ChangeMe456!");
      assert.equal(config.requireRevalidation, false);
      assert.equal(config.slug, "legal/terms");
      assert.equal(config.tenantSlug, "default");
      assert.equal(config.webUrl, "https://web.example.com");
    },
  );
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
