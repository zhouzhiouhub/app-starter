import assert from "node:assert/strict";
import test from "node:test";
import {
  readTranslationImportFocusedResultKey,
  readTranslationImportFocusFilters,
  readTranslationImportFocusFiltersForKey,
  readTranslationImportFocusKey,
} from "../src/features/localization/translation-import-focus.ts";

const importResult = {
  entries: [
    {
      action: "create",
      index: 0,
      key: "page.home.hero.title",
      locale: "en-US",
      value: "Build better storefronts",
    },
    {
      action: "update",
      index: 1,
      key: "section.faq.answer",
      locale: "en-US",
      value: "Answer",
    },
  ],
  summary: {
    createdCount: 1,
    importedCount: 2,
    totalEntries: 2,
    updatedCount: 1,
  },
};

test("translation import focus reads the first imported key", () => {
  assert.equal(
    readTranslationImportFocusKey(importResult),
    "page.home.hero.title",
  );
  assert.equal(
    readTranslationImportFocusKey({
      entries: [],
      summary: {
        createdCount: 0,
        importedCount: 0,
        totalEntries: 0,
        updatedCount: 0,
      },
    }),
    null,
  );
});

test("translation import focus keeps a selected imported result key", () => {
  assert.equal(
    readTranslationImportFocusedResultKey(importResult, "section.faq.answer"),
    "section.faq.answer",
  );
  assert.equal(
    readTranslationImportFocusedResultKey(importResult, "page.missing.title"),
    "page.home.hero.title",
  );
});

test("translation import focus builds repair filters for the imported key", () => {
  assert.deepEqual(
    readTranslationImportFocusFilters(importResult, {
      limit: 50,
      namespace: "section.faq",
      page: 3,
      query: "answer",
    }),
    {
      limit: 50,
      namespace: "page.home",
      page: 1,
      query: "page.home.hero.title",
    },
  );
});

test("translation import focus builds repair filters for a selected result row", () => {
  assert.deepEqual(
    readTranslationImportFocusFiltersForKey("section.faq.answer", {
      limit: 20,
    }),
    {
      limit: 20,
      namespace: "section.faq",
      page: 1,
      query: "section.faq.answer",
    },
  );
});
