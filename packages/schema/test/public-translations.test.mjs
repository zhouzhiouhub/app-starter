import assert from "node:assert/strict";
import test from "node:test";
import {
  i18nTextSchema,
  publicTranslationEntryMaxCount,
  publicTranslationKeyMaxLength,
  publicTranslationMessageMaxLength,
  translationEntryMaxCount,
  translationKeyMaxLength,
  translationKeyPattern,
  translationKeySchema,
  translationValueMaxLength,
} from "../dist/index.js";

test("public translation limits keep bounded positive values", () => {
  assert.equal(translationEntryMaxCount, 2_000);
  assert.equal(publicTranslationEntryMaxCount, 2_000);
  assert.equal(publicTranslationKeyMaxLength, 256);
  assert.equal(publicTranslationMessageMaxLength, 20_000);
  assert.equal(translationKeyMaxLength, publicTranslationKeyMaxLength);
  assert.equal(translationValueMaxLength, publicTranslationMessageMaxLength);
});

test("translation keys use lowercase dot-separated segments", () => {
  assert.equal(
    translationKeySchema.parse("page.home.hero-title"),
    "page.home.hero-title",
  );
  assert.equal(translationKeyPattern.test("section.cta.label"), true);

  for (const key of [
    "homepage",
    "Page.home.title",
    "page.home.",
    "page..home",
    "page_home.title",
    " page.home.title ",
    "page.home\u0000title",
  ]) {
    assert.equal(translationKeySchema.safeParse(key).success, false);
  }

  assert.equal(
    i18nTextSchema.safeParse({
      defaultValue: "Hero title",
      i18nKey: "Page.home.title",
    }).success,
    false,
  );
});
