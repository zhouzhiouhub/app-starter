import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrderedSectionsForViewport,
  getPageTemplateChrome,
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  getStorefrontHref,
  collectMediaReferences,
  publishedPageRevalidateSeconds,
  publishedPagesCacheTag,
  pageSchema,
  resolveMediaReferences,
  resolveLocaleFromPath,
  rewriteStorefrontHref,
  setSectionOrderForViewport,
  toStorefrontPathPrefix,
} from "../dist/index.js";

function minimalPage(input = {}) {
  return {
    version: "1.0",
    meta: { slug: "test-page", title: "Test page", market: "us", locale: "en-US" },
    layout: { desktop: {}, mobile: {} },
    sections: [],
    seo: { title: "Test page", description: "" },
    ...input,
  };
}

function section(id, component) {
  return {
    component,
    id,
    layout: {
      desktop: { width: 1200, x: 0, y: 0 },
      mobile: { width: 390, x: 0, y: 0 },
    },
    props: {},
  };
}

test("page schema keeps default chrome for legacy pages", () => {
  const parsed = pageSchema.parse(minimalPage());

  assert.equal(parsed.template.id, "default");
  assert.equal(parsed.chrome.header.enabled, true);
  assert.equal(parsed.chrome.header.variant, "default");
  assert.equal(
    parsed.chrome.header.content.brand.label.defaultValue,
    "App Starter",
  );
  assert.equal(parsed.chrome.header.content.navigation.length, 3);
  assert.equal(parsed.chrome.header.content.navigation[1]?.href, "/en/privacy");
  assert.equal(parsed.chrome.footer.content.navigation[2]?.href, "/en/contact");
  assert.equal(parsed.chrome.header.content.localeSwitcher.enabled, true);
  assert.equal(
    parsed.chrome.header.content.localeSwitcher.locales[0].code,
    "en-US",
  );
  assert.equal(parsed.chrome.footer.enabled, true);
  assert.equal(parsed.chrome.footer.variant, "default");
  assert.equal(parsed.chrome.footer.content.navigation.length, 3);
});

test("landing blank template disables header and footer", () => {
  const chrome = getPageTemplateChrome("landing-blank");

  assert.equal(chrome.header.enabled, false);
  assert.equal(chrome.header.variant, "minimal");
  assert.equal(chrome.header.content.navigation[0].label.defaultValue, "Home");
  assert.equal(chrome.footer.enabled, false);
  assert.equal(chrome.footer.variant, "minimal");
  assert.equal(
    chrome.footer.content.copyright.defaultValue,
    "(c) 2026 App Starter. All rights reserved.",
  );
});

test("page schema accepts per-page chrome overrides", () => {
  const parsed = pageSchema.parse(
    minimalPage({
      template: { id: "policy" },
      chrome: {
        header: { enabled: false },
        footer: { enabled: true, variant: "minimal" },
      },
    }),
  );

  assert.equal(parsed.template.id, "policy");
  assert.equal(parsed.chrome.header.enabled, false);
  assert.equal(parsed.chrome.header.variant, "default");
  assert.equal(
    parsed.chrome.header.content.brand.label.defaultValue,
    "App Starter",
  );
  assert.equal(parsed.chrome.footer.enabled, true);
  assert.equal(parsed.chrome.footer.variant, "minimal");
  assert.equal(parsed.chrome.footer.content.navigation.length, 3);
});

test("page schema rejects unsafe chrome navigation hrefs", () => {
  assert.throws(() =>
    pageSchema.parse(
      minimalPage({
        chrome: {
          header: {
            content: {
              navigation: [
                {
                  id: "bad",
                  label: { defaultValue: "Bad link" },
                  href: "javascript:alert(1)",
                },
              ],
            },
          },
        },
      }),
    ),
  );
});

test("page schema orders sections per viewport with legacy fallback", () => {
  const page = pageSchema.parse(
    minimalPage({
      layout: {
        desktop: {
          sectionOrder: ["copy", "hero", "missing", "copy"],
        },
        mobile: {},
      },
      sections: [
        section("hero", "hero-banner"),
        section("copy", "rich-text"),
        section("cta", "cta-bar"),
      ],
    }),
  );

  assert.deepEqual(
    getOrderedSectionsForViewport(page, "desktop").map((node) => node.id),
    ["copy", "hero", "cta"],
  );
  assert.deepEqual(
    getOrderedSectionsForViewport(page, "mobile").map((node) => node.id),
    ["hero", "copy", "cta"],
  );

  const reordered = setSectionOrderForViewport(page, "mobile", ["cta", "hero"]);

  assert.deepEqual(reordered.layout.mobile.sectionOrder, [
    "cta",
    "hero",
    "copy",
  ]);
});

test("page schema accepts safe SEO URLs", () => {
  const parsed = pageSchema.parse(
    minimalPage({
      seo: {
        canonical: "https://example.com/en/test-page",
        description: "Safe SEO fields",
        ogImage: "media://asset-1",
        title: "Safe SEO",
      },
    }),
  );

  assert.equal(parsed.seo.canonical, "https://example.com/en/test-page");
  assert.equal(parsed.seo.ogImage, "media://asset-1");
  assert.equal(parsed.seo.noIndex, false);
});

test("page schema accepts noIndex SEO flag", () => {
  const parsed = pageSchema.parse(
    minimalPage({
      seo: {
        description: "Hidden from search results",
        noIndex: true,
        title: "Hidden page",
      },
    }),
  );

  assert.equal(parsed.seo.noIndex, true);
});

test("page schema keeps canonical URLs stricter than SEO images", () => {
  assert.throws(() =>
    pageSchema.parse(
      minimalPage({
        seo: {
          canonical: "media://asset-1",
          description: "",
          title: "Bad canonical",
        },
      }),
    ),
  );
});

test("media references can be collected and resolved", () => {
  const input = {
    hero: {
      image: "media://asset-1",
    },
    gallery: ["media://asset-2", "https://cdn.example.com/static.jpg"],
  };
  const references = collectMediaReferences(input);
  const resolved = resolveMediaReferences(input, (reference) =>
    reference.replace("media://", "https://cdn.example.com/"),
  );

  assert.deepEqual(references, ["media://asset-1", "media://asset-2"]);
  assert.equal(resolved.hero.image, "https://cdn.example.com/asset-1");
  assert.equal(resolved.gallery[0], "https://cdn.example.com/asset-2");
  assert.equal(resolved.gallery[1], "https://cdn.example.com/static.jpg");
});

test("page schema rejects unsafe SEO URLs", () => {
  assert.throws(() =>
    pageSchema.parse(
      minimalPage({
        seo: {
          canonical: "javascript:alert(1)",
          description: "",
          ogImage: "data:text/html,bad",
          title: "Bad SEO",
        },
      }),
    ),
  );
});

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
