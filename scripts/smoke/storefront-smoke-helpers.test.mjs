import assert from "node:assert/strict";
import test from "node:test";
import {
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  parseSitemapUrls,
} from "./storefront-smoke.mjs";
import { createStorefrontSmokeRequestInit } from "./storefront-smoke-http.mjs";

test("storefront smoke helpers preserve nested storefront slugs", () => {
  assert.equal(getStorefrontPath("en-US", "home"), "/en");
  assert.equal(getStorefrontPath("en-US", "legal/terms"), "/en/legal/terms");
  assert.equal(
    joinUrl("https://example.com", "/en/legal/terms"),
    "https://example.com/en/legal/terms",
  );
});

test("storefront smoke helpers parse sitemap URLs", () => {
  assert.deepEqual(
    parseSitemapUrls(`<?xml version="1.0"?>
<urlset>
  <url><loc>https://web.example.com/en</loc></url>
  <url><loc>https://web.example.com/en/campaign</loc></url>
</urlset>`),
    ["https://web.example.com/en", "https://web.example.com/en/campaign"],
  );
});

test("storefront smoke helpers detect noindex robots metadata", () => {
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

test("storefront smoke request helper forwards storefront hosts", () => {
  assert.deepEqual(
    createStorefrontSmokeRequestInit(
      { storefrontHost: "store.brand-platform.com" },
      {
        headers: {
          Accept: "text/html",
        },
        method: "GET",
      },
    ),
    {
      headers: {
        Accept: "text/html",
        "x-storefront-host": "store.brand-platform.com",
      },
      method: "GET",
    },
  );
  assert.deepEqual(createStorefrontSmokeRequestInit({}, { method: "GET" }), {
    method: "GET",
  });
});
