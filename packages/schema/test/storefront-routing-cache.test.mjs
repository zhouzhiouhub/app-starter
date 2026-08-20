import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  getStorefrontHref,
  publishedPageRevalidateSeconds,
  publishedPagesCacheTag,
  resolveLocaleFromPath,
  rewriteStorefrontHref,
  toStorefrontPathPrefix,
} from "../dist/index.js";

test("storefront hrefs use short language prefixes", () => {
  assert.equal(toStorefrontPathPrefix("en-US"), "en");
  assert.equal(toStorefrontPathPrefix("de-DE"), "de");
  assert.equal(toStorefrontPathPrefix("en"), "en");
  assert.equal(getStorefrontHref("en-US"), "/en");
  assert.equal(getStorefrontHref("en-US", "contact"), "/en/contact");
  assert.equal(rewriteStorefrontHref("/en-US/contact"), "/en/contact");
  assert.equal(rewriteStorefrontHref("/en-US"), "/en");
  assert.equal(rewriteStorefrontHref("/privacy"), "/privacy");
  assert.equal(resolveLocaleFromPath("en"), "en-US");
  assert.equal(resolveLocaleFromPath("en-US"), "en-US");
  assert.equal(resolveLocaleFromPath("de"), "de");
});

test("published page cache helpers define ISR tags and paths", () => {
  assert.equal(publishedPageRevalidateSeconds, 60);
  assert.equal(publishedPagesCacheTag, "published-page");
  assert.deepEqual(
    getPublishedPageCacheTags({
      fallbackLocale: "en-US",
      locale: "en-US",
      market: "us",
      slug: "contact",
    }),
    [
      "published-page",
      "published-page:us:en-US",
      "published-page:us:en-US:contact",
    ],
  );
  assert.deepEqual(
    getPublishedPageCacheTags({
      fallbackLocale: "en-US",
      locale: "de-DE",
      market: "us",
      slug: "contact",
    }),
    [
      "published-page",
      "published-page:us:de-DE",
      "published-page:us:de-DE:contact",
      "published-page:us:en-US",
      "published-page:us:en-US:contact",
    ],
  );
  assert.deepEqual(
    getPublishedPageRevalidationPaths({ locale: "en-US", slug: "home" }),
    ["/", "/en"],
  );
  assert.deepEqual(
    getPublishedPageRevalidationPaths({ locale: "en-US", slug: "contact" }),
    ["/en/contact"],
  );
});
