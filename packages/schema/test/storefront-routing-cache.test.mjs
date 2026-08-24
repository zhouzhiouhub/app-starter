import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  getPublishedPagesCacheTags,
  getPublicTranslationCacheTags,
  getStorefrontRevalidationCacheTags,
  getStorefrontHref,
  publishedPageRevalidateSeconds,
  publishedPagesCacheTag,
  publicTranslationsCacheTag,
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
    getPublishedPagesCacheTags({
      fallbackLocale: "en-US",
      locale: "de-DE",
      market: "us",
    }),
    ["published-page", "published-page:us:de-DE", "published-page:us:en-US"],
  );
  const siteTags = getPublishedPageCacheTags({
    fallbackLocale: "en-US",
    locale: "de-DE",
    market: "us",
    siteHost: "Store.Brand-Platform.com:443",
    slug: "contact",
  });
  assert.equal(siteTags.length, 5);
  assert.match(siteTags[0], /^published-page:site:[a-z0-9]+$/);
  assert.equal(siteTags[1], `${siteTags[0]}:us:de-DE`);
  assert.equal(siteTags[2], `${siteTags[0]}:us:de-DE:contact`);
  assert.equal(siteTags[3], `${siteTags[0]}:us:en-US`);
  assert.equal(siteTags[4], `${siteTags[0]}:us:en-US:contact`);
  assert.deepEqual(
    siteTags,
    getPublishedPageCacheTags({
      fallbackLocale: "en-US",
      locale: "de-DE",
      market: "us",
      siteHost: "store.brand-platform.com",
      slug: "contact",
    }),
  );
  assert.deepEqual(
    getPublishedPageCacheTags({
      locale: "en-US",
      market: "us",
      siteHost: "store.example.com",
      slug: "contact",
    }),
    [
      "published-page",
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

test("public translation cache helpers define locale and site tags", () => {
  assert.equal(publicTranslationsCacheTag, "public-translation");
  assert.deepEqual(
    getPublicTranslationCacheTags({
      fallbackLocale: "en-US",
      locale: "en-US",
    }),
    ["public-translation", "public-translation:en-US"],
  );
  assert.deepEqual(
    getPublicTranslationCacheTags({
      fallbackLocale: "en-US",
      locale: "de-DE",
    }),
    [
      "public-translation",
      "public-translation:de-DE",
      "public-translation:en-US",
    ],
  );

  const siteTags = getPublicTranslationCacheTags({
    fallbackLocale: "en-US",
    locale: "de-DE",
    siteHost: "Store.Brand-Platform.com:443",
  });
  assert.equal(siteTags.length, 3);
  assert.match(siteTags[0], /^public-translation:site:[a-z0-9]+$/);
  assert.equal(siteTags[1], `${siteTags[0]}:de-DE`);
  assert.equal(siteTags[2], `${siteTags[0]}:en-US`);
  assert.deepEqual(
    siteTags,
    getPublicTranslationCacheTags({
      fallbackLocale: "en-US",
      locale: "de-DE",
      siteHost: "store.brand-platform.com",
    }),
  );
  assert.deepEqual(
    getPublicTranslationCacheTags({
      locale: "en-US",
      siteHost: "store.example.com",
    }),
    ["public-translation", "public-translation:en-US"],
  );
});

test("storefront revalidation cache helper includes page and translation tags", () => {
  assert.deepEqual(
    getStorefrontRevalidationCacheTags({
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
      "public-translation",
      "public-translation:de-DE",
      "public-translation:en-US",
    ],
  );
});
