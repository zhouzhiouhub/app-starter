import assert from "node:assert/strict";
import test from "node:test";
import {
  createFallbackPage,
  getFallbackPageTemplateId,
  getPageTemplateChrome,
  pageSchema,
} from "../dist/index.js";

function minimalPage(input = {}) {
  return {
    version: "1.0",
    meta: {
      slug: "test-page",
      title: "Test page",
      market: "us",
      locale: "en-US",
    },
    layout: {
      desktop: {},
      mobile: {},
    },
    sections: [],
    seo: {
      title: "Test page",
      description: "",
    },
    ...input,
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

test("privacy and terms fallback pages keep global chrome visible", () => {
  assert.equal(getFallbackPageTemplateId("privacy"), "policy");
  assert.equal(getFallbackPageTemplateId("terms"), "policy");

  const privacyPage = createFallbackPage({ slug: "privacy" });

  assert.equal(privacyPage.template.id, "policy");
  assert.equal(privacyPage.chrome.header.enabled, true);
  assert.equal(privacyPage.chrome.footer.enabled, true);
  assert.equal(privacyPage.chrome.footer.variant, "default");
});

test("fallback pages inherit site chrome content without turning chrome off", () => {
  const siteChrome = pageSchema.parse(
    minimalPage({
      template: { id: "default" },
      chrome: {
        header: {
          enabled: true,
          variant: "default",
          content: {
            brand: { label: { defaultValue: "Published Brand" }, href: "/" },
            navigation: [
              {
                id: "home",
                label: { defaultValue: "Home" },
                href: "/",
              },
              {
                id: "privacy",
                label: { defaultValue: "Privacy" },
                href: "/en-US/privacy",
              },
            ],
          },
        },
        footer: {
          enabled: true,
          variant: "minimal",
          content: {
            brand: { label: { defaultValue: "Published Brand" }, href: "/" },
            copyright: { defaultValue: "(c) Published" },
            navigation: [
              {
                id: "privacy",
                label: { defaultValue: "Privacy" },
                href: "/en-US/privacy",
              },
            ],
          },
        },
      },
    }),
  ).chrome;

  const privacyPage = createFallbackPage({
    slug: "privacy",
    siteChrome,
  });

  assert.equal(privacyPage.chrome.header.enabled, true);
  assert.equal(
    privacyPage.chrome.header.content.brand.label.defaultValue,
    "Published Brand",
  );
  assert.equal(privacyPage.chrome.header.content.navigation.length, 2);
  assert.equal(privacyPage.chrome.footer.enabled, true);
  assert.equal(privacyPage.chrome.footer.variant, "minimal");
  assert.equal(
    privacyPage.chrome.footer.content.copyright.defaultValue,
    "(c) Published",
  );
});
