import assert from "node:assert/strict";
import test from "node:test";
import {
  filterTranslationImportResultEntries,
  readTranslationImportResultActionOptions,
} from "../src/features/localization/translation-import-result-filter.ts";

const importResult = {
  entries: [
    {
      action: "create",
      index: 0,
      key: "page.home.hero.title",
      locale: "en-US",
      value: "Title",
    },
    {
      action: "update",
      index: 1,
      key: "page.home.hero.body",
      locale: "en-US",
      value: "Body",
    },
  ],
  summary: {
    createdCount: 1,
    importedCount: 2,
    totalEntries: 2,
    updatedCount: 1,
  },
};

test("translation import result filters entries by action", () => {
  assert.deepEqual(
    filterTranslationImportResultEntries(importResult, "create").map(
      (entry) => entry.key,
    ),
    ["page.home.hero.title"],
  );
  assert.deepEqual(
    filterTranslationImportResultEntries(importResult, "all").map(
      (entry) => entry.key,
    ),
    ["page.home.hero.title", "page.home.hero.body"],
  );
});

test("translation import result action options use summary counts", () => {
  assert.deepEqual(readTranslationImportResultActionOptions(importResult), [
    { count: 2, label: "All", value: "all" },
    { count: 1, label: "Created", value: "create" },
    { count: 1, label: "Updated", value: "update" },
  ]);
});
