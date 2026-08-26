import assert from "node:assert/strict";
import test from "node:test";
import { collectPageTranslationKeys } from "../dist/index.js";
import { minimalPage, section } from "./page-schema-test-helpers.mjs";

test("page translation key collector reads chrome and section i18n keys", () => {
  const page = minimalPage({
    chrome: {
      header: {
        content: {
          brand: {
            label: {
              defaultValue: "Brand",
              i18nKey: "chrome.brand.label",
            },
          },
          navigation: [
            {
              href: "/en/privacy",
              id: "privacy",
              label: {
                defaultValue: "Privacy",
                i18nKey: "chrome.nav.privacy",
              },
            },
          ],
        },
      },
    },
    sections: [
      {
        ...section("hero", "hero"),
        props: {
          body: {
            defaultValue: "Body",
            i18nKey: "page.home.hero.body",
          },
          title: {
            defaultValue: "Title",
            i18nKey: "page.home.hero.title",
          },
        },
      },
    ],
  });

  assert.deepEqual(collectPageTranslationKeys(page), [
    "chrome.brand.label",
    "chrome.nav.privacy",
    "page.home.hero.body",
    "page.home.hero.title",
  ]);
});

test("page translation key collector deduplicates and ignores invalid keys", () => {
  assert.deepEqual(
    collectPageTranslationKeys({
      items: [
        { i18nKey: "page.home.hero.title" },
        { i18nKey: "page.home.hero.title" },
        { i18nKey: "Page.home.hero.title" },
        { i18nKey: "" },
        null,
      ],
    }),
    ["page.home.hero.title"],
  );
});
