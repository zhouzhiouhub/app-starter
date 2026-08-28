import assert from "node:assert/strict";
import test from "node:test";
import { readTranslationImportHistoryFilterAlignment } from "../src/features/localization/translation-import-history-alignment.ts";

const importResult = {
  entries: [
    {
      action: "create",
      index: 0,
      key: "page.home.hero.title",
      locale: "en-US",
      value: "Title",
    },
  ],
  summary: {
    createdCount: 1,
    importedCount: 1,
    totalEntries: 1,
    updatedCount: 0,
  },
};

test("translation import history alignment points filtered tables at replayed keys", () => {
  assert.deepEqual(
    readTranslationImportHistoryFilterAlignment({
      filters: {
        namespace: "section.faq",
        query: "answer",
      },
      result: importResult,
    }),
    {
      focusKey: "page.home.hero.title",
      message:
        "History replay is not aligned with current translation filters. Align filters to page.home.hero.title before reviewing or rebuilding drafts from this replay.",
    },
  );
});

test("translation import history alignment stays quiet when filters already match", () => {
  assert.equal(
    readTranslationImportHistoryFilterAlignment({
      filters: {
        namespace: "page.home",
        query: "page.home.hero.title",
      },
      result: importResult,
    }),
    null,
  );
});

test("translation import history alignment ignores unfiltered views", () => {
  assert.equal(
    readTranslationImportHistoryFilterAlignment({
      filters: {},
      result: importResult,
    }),
    null,
  );
});
