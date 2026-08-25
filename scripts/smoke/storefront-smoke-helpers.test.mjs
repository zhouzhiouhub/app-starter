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
  readOpenGraphUrl,
} from "./storefront-smoke.mjs";
import {
  createStorefrontSmokeRequestInit,
  fetchStorefrontText,
} from "./storefront-smoke-http.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

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

test("storefront smoke helpers read Open Graph URLs", () => {
  assert.equal(
    readOpenGraphUrl(
      '<meta content="https://web.example.com/en" property="og:url" />',
    ),
    "https://web.example.com/en",
  );
  assert.equal(
    readOpenGraphUrl("<meta PROPERTY='og:url' CONTENT='/en/legal/terms'>"),
    "/en/legal/terms",
  );
  assert.equal(
    readOpenGraphUrl('<meta property="og:title" content="Campaign" />'),
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

test("storefront smoke request helper skips redirected response bodies", async () => {
  let bodyCanceled = false;

  await withFetch(
    async () => ({
      body: {
        async cancel() {
          bodyCanceled = true;
        },
      },
      headers: new Headers({
        location: "https://web.example.com/login?token=payload.signature",
      }),
      ok: false,
      status: 302,
      statusText: "Found",
      async text() {
        throw new Error("redirect response bodies should not be read");
      },
    }),
    async () => {
      const response = await fetchStorefrontText(
        "https://web.example.com/en/smoke-page",
        {},
      );

      assert.deepEqual(response, {
        ok: false,
        redirectLocation: "https://web.example.com/login?token=[redacted]",
        status: 302,
        statusText: "Found",
        text: "",
        url: "https://web.example.com/en/smoke-page",
      });
      assert.equal(bodyCanceled, true);
    },
  );
});

test("storefront smoke request helper caps streamed response bodies", async () => {
  await withFetch(
    async () =>
      new Response("x".repeat(1_000_001), {
        status: 200,
        statusText: "OK",
      }),
    async () => {
      const response = await fetchStorefrontText(
        "https://web.example.com/en/smoke-page?token=payload.signature",
        {},
      );

      assert.equal(response.ok, true);
      assert.equal(response.status, 200);
      assert.equal(response.text, "");
      assert.equal(
        response.bodyReadError,
        "https://web.example.com/en/smoke-page?token=[redacted] returned a storefront response body larger than 1000000 bytes.",
      );
    },
  );
});
