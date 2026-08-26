import assert from "node:assert/strict";
import test from "node:test";
import {
  i18nTextSchema,
  publicTranslationEntryMaxCount,
  publicTranslationKeyMaxLength,
  publicTranslationMessageMaxLength,
  translationBulkPreviewMaxEntries,
  translationEntryMaxCount,
  translationExportPreviewKeyMaxCount,
  translationKeyMaxLength,
  translationKeyPattern,
  translationKeySchema,
  translationListDefaultLimit,
  translationListMaxLimit,
  translationMissingKeyPreviewMaxCount,
  translationNamespaceMaxLength,
  translationNamespacePattern,
  translationNamespaceSchema,
  translationSearchMaxLength,
  translationValueMaxLength,
} from "../dist/index.js";

test("public translation limits keep bounded positive values", () => {
  assert.equal(translationEntryMaxCount, 2_000);
  assert.equal(translationListDefaultLimit, 20);
  assert.equal(translationListMaxLimit, 100);
  assert.equal(translationBulkPreviewMaxEntries, 200);
  assert.equal(translationExportPreviewKeyMaxCount, 50);
  assert.equal(translationMissingKeyPreviewMaxCount, 50);
  assert.equal(publicTranslationEntryMaxCount, 2_000);
  assert.equal(publicTranslationKeyMaxLength, 256);
  assert.equal(publicTranslationMessageMaxLength, 20_000);
  assert.equal(translationKeyMaxLength, publicTranslationKeyMaxLength);
  assert.equal(translationNamespaceMaxLength, translationKeyMaxLength);
  assert.equal(translationSearchMaxLength, 128);
  assert.equal(translationValueMaxLength, publicTranslationMessageMaxLength);
});

test("translation keys use lowercase dot-separated segments", () => {
  assert.equal(
    translationKeySchema.parse("page.home.hero-title"),
    "page.home.hero-title",
  );
  assert.equal(translationKeyPattern.test("section.cta.label"), true);
  assert.equal(translationNamespaceSchema.parse("page"), "page");
  assert.equal(translationNamespaceSchema.parse("page.home"), "page.home");
  assert.equal(translationNamespacePattern.test("section.cta"), true);

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

  for (const namespace of [
    "Page",
    "page.",
    "page..home",
    "page_home",
    " page.home ",
    "page.home\u0000",
  ]) {
    assert.equal(
      translationNamespaceSchema.safeParse(namespace).success,
      false,
    );
  }

  assert.equal(
    i18nTextSchema.safeParse({
      defaultValue: "Hero title",
      i18nKey: "Page.home.title",
    }).success,
    false,
  );
});
