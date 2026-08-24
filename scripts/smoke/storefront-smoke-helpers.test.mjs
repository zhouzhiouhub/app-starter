import assert from "node:assert/strict";
import test from "node:test";
import {
  getExpectedStorefrontOrigin,
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  parseSitemapUrls,
  readCanonicalHref,
  readExpectedCanonicalUrl,
} from "./storefront-smoke.mjs";
import { createStorefrontSmokeRequestInit } from "./storefront-smoke-http.mjs";

test("storefront smoke helpers preserve nested storefront slugs", () => {
  assert.equal(getStorefrontPath("en-US", "home"), "/en");
  assert.equal(getStorefrontPath("en-US", "legal/terms"), "/en/legal/terms");
  assert.equal(getStorefrontPath("fr-FR", "legal/terms"), "/fr/legal/terms");
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

test("storefront smoke helpers resolve expected SEO origins", () => {
  assert.equal(
    getExpectedStorefrontOrigin({
      storefrontHost: "Store.Brand-Platform.com:443",
      webUrl: "http://localhost:3000",
    }),
    "https://store.brand-platform.com",
  );
  assert.equal(
    getExpectedStorefrontOrigin({
      storefrontHost: "localhost:3000",
      webUrl: "https://web.example.com",
    }),
    "http://localhost:3000",
  );
  assert.equal(
    getExpectedStorefrontOrigin({
      storefrontHost: null,
      webUrl: "https://web.example.com",
    }),
    "https://web.example.com",
  );
  assert.equal(
    getExpectedStorefrontOrigin({
      storefrontHost: "https://store.brand-platform.com",
      webUrl: "https://web.example.com",
    }),
    "https://web.example.com",
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

test("storefront smoke helpers read canonical links", () => {
  assert.equal(
    readCanonicalHref(
      '<link href="https://web.example.com/en" rel="alternate canonical" />',
    ),
    "https://web.example.com/en",
  );
  assert.equal(
    readCanonicalHref("<link REL='canonical' HREF='/en/legal/terms'>"),
    "/en/legal/terms",
  );
  assert.equal(
    readCanonicalHref('<link rel="stylesheet" href="/app.css" />'),
    null,
  );
});

test("storefront smoke helpers build the expected canonical URL", () => {
  assert.equal(
    readExpectedCanonicalUrl({
      locale: "en-US",
      slug: "legal/terms",
      storefrontHost: "Store.Brand-Platform.com:443",
      webUrl: "http://localhost:3000",
    }),
    "https://store.brand-platform.com/en/legal/terms",
  );
});

test("storefront smoke request helper forwards storefront hosts", () => {
  assert.deepEqual(
    createStorefrontSmokeRequestInit(
      { storefrontHost: "Store.Brand-Platform.com:443" },
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
      redirect: "manual",
    },
  );
  assert.deepEqual(createStorefrontSmokeRequestInit({}, { method: "GET" }), {
    method: "GET",
    redirect: "manual",
  });
  assert.deepEqual(
    createStorefrontSmokeRequestInit(
      { storefrontHost: "https://store.brand-platform.com" },
      { method: "GET" },
    ),
    {
      method: "GET",
      redirect: "manual",
    },
  );
});
