import assert from "node:assert/strict";
import test from "node:test";
import {
  createFallbackPage,
  getFallbackPageTemplateId,
  pageSchema,
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

test("named landing fallback pages do not reuse the home hero", () => {
  const faq = createFallbackPage({ slug: "faq", title: "Faq" });
  const hero = faq.sections.find(
    (section) => section.component === "hero-banner",
  );

  assert.equal(
    hero &&
      typeof hero.props.title === "object" &&
      hero.props.title &&
      "defaultValue" in hero.props.title
      ? hero.props.title.defaultValue
      : null,
    "Faq",
  );

  const home = createFallbackPage({ slug: "home" });
  assert.equal(
    home.sections[0] &&
      typeof home.sections[0].props.title === "object" &&
      home.sections[0].props.title &&
      "defaultValue" in home.sections[0].props.title
      ? home.sections[0].props.title.defaultValue
      : null,
    "High-fidelity storefront builder",
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
  assert.equal(privacyPage.sections[0]?.component, "rich-text");
});

test("404 fallback pages use the system template", () => {
  assert.equal(getFallbackPageTemplateId("404"), "system");

  const notFoundPage = createFallbackPage({ slug: "404" });

  assert.equal(notFoundPage.meta.title, "Page not found");
  assert.equal(notFoundPage.template.id, "system");
  assert.equal(notFoundPage.chrome.header.enabled, true);
  assert.equal(notFoundPage.chrome.footer.enabled, true);
  assert.equal(notFoundPage.seo.noIndex, true);
  assert.equal(notFoundPage.sections[0]?.id, "system-hero");
  assert.equal(notFoundPage.sections[0]?.props.eyebrow, "404");
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
