import assert from "node:assert/strict";
import test from "node:test";
import { assertIndexableStorefrontPage } from "./storefront-smoke.mjs";

test("storefront page SEO smoke accepts the expected canonical URL", () => {
  assert.doesNotThrow(() =>
    assertIndexableStorefrontPage(
      [
        "<html><head>",
        '<link rel="canonical" href="https://store.brand-platform.com/en/smoke-page" />',
        '<meta property="og:url" content="https://store.brand-platform.com/en/smoke-page" />',
        "</head></html>",
      ].join(""),
      {
        locale: "en-US",
        slug: "smoke-page",
        storefrontHost: "store.brand-platform.com",
        webUrl: "https://web.example.com",
      },
    ),
  );
});

test("storefront page SEO smoke reports noindex metadata", () => {
  assert.throws(
    () =>
      assertIndexableStorefrontPage(
        [
          "<html><head>",
          '<meta name="robots" content="noindex,nofollow" />',
          '<link rel="canonical" href="https://store.brand-platform.com/en/smoke-page" />',
          "</head></html>",
        ].join(""),
        {
          locale: "en-US",
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
          webUrl: "https://web.example.com",
        },
      ),
    (error) => {
      assert.equal(
        error.message,
        "Storefront page rendered noindex robots metadata.",
      );
      assert.deepEqual(error.smokeDetails.storefrontSeo, {
        diagnosis: "noindex-page",
        url: "https://web.example.com/en/smoke-page",
      });

      return true;
    },
  );
});

test("storefront page SEO smoke reports canonical mismatches", () => {
  assert.throws(
    () =>
      assertIndexableStorefrontPage(
        [
          "<html><head>",
          '<link rel="canonical" href="https://web.example.com/en/smoke-page" />',
          "</head></html>",
        ].join(""),
        {
          locale: "en-US",
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
          webUrl: "https://web.example.com",
        },
      ),
    (error) => {
      assert.deepEqual(error.smokeDetails.storefrontSeo, {
        canonicalHref: "https://web.example.com/en/smoke-page",
        diagnosis: "canonical-mismatch",
        expectedCanonicalUrl: "https://store.brand-platform.com/en/smoke-page",
        url: "https://web.example.com/en/smoke-page",
      });

      return true;
    },
  );
});

test("storefront page SEO smoke reports Open Graph URL mismatches", () => {
  assert.throws(
    () =>
      assertIndexableStorefrontPage(
        [
          "<html><head>",
          '<link rel="canonical" href="https://store.brand-platform.com/en/smoke-page" />',
          '<meta property="og:url" content="https://web.example.com/en/smoke-page" />',
          "</head></html>",
        ].join(""),
        {
          locale: "en-US",
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
          webUrl: "https://web.example.com",
        },
      ),
    (error) => {
      assert.equal(
        error.message,
        "Storefront page Open Graph URL mismatch: expected https://store.brand-platform.com/en/smoke-page, received https://web.example.com/en/smoke-page.",
      );
      assert.deepEqual(error.smokeDetails.storefrontSeo, {
        diagnosis: "open-graph-url-mismatch",
        expectedOpenGraphUrl: "https://store.brand-platform.com/en/smoke-page",
        openGraphUrl: "https://web.example.com/en/smoke-page",
        url: "https://web.example.com/en/smoke-page",
      });

      return true;
    },
  );
});
