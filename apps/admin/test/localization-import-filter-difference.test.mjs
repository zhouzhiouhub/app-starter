import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTranslationImportFilterDifferenceMessage,
  readTranslationImportPreviewFilterDifference,
} from "../src/features/localization/translation-import-filter-difference.ts";

test("translation import filter difference explains draft rows outside filters", () => {
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: JSON.stringify({
        entries: [
          {
            context: "page.home.hero / title",
            key: "page.home.hero.title",
            value: "Title",
          },
          {
            context: "section.faq / answer",
            key: "section.faq.answer",
            value: "Answer",
          },
        ],
      }),
      namespace: "page.home",
      query: "hero",
    }),
    "1 draft row is outside current translation filters (namespace=page.home, q=hero). Import still writes default Locale rows, but the table may hide them until filters are cleared.",
  );
});

test("translation import filter difference matches query against value and context", () => {
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: JSON.stringify({
        entries: [
          {
            context: "page.home.hero / title",
            key: "page.home.hero.title",
            value: "Title",
          },
        ],
      }),
      namespace: "page.home",
      query: "Title",
    }),
    null,
  );
});

test("translation import filter difference ignores missing filters and invalid JSON", () => {
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: JSON.stringify({
        entries: [{ key: "section.faq.answer", value: "Answer" }],
      }),
    }),
    null,
  );
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: "{",
      namespace: "page.home",
    }),
    null,
  );
});

test("translation import preview filter difference locates the first outside key", () => {
  assert.deepEqual(
    readTranslationImportPreviewFilterDifference({
      filters: {
        namespace: "page.home",
        query: "hero",
      },
      preview: {
        entries: [
          {
            action: "create",
            index: 0,
            issues: [],
            key: "page.home.hero.title",
            locale: "en-US",
          },
          {
            action: "update",
            index: 1,
            issues: [],
            key: "section.faq.answer",
            locale: "en-US",
          },
        ],
        summary: {
          blockedCount: 0,
          createCount: 1,
          duplicateCount: 0,
          errorCount: 0,
          totalEntries: 2,
          updateCount: 1,
        },
      },
    }),
    {
      count: 1,
      firstKey: "section.faq.answer",
      message:
        "1 preview row key is outside current translation filters (namespace=page.home, q=hero). Focus section.faq.answer to prepare the table filters before importing or reviewing the saved row.",
    },
  );
});

test("translation import preview filter difference ignores invalid or matching keys", () => {
  assert.equal(
    readTranslationImportPreviewFilterDifference({
      filters: {
        query: "hero",
      },
      preview: {
        entries: [
          {
            action: "error",
            index: 0,
            issues: [],
            key: "Page.Home.Title",
            locale: "en-US",
          },
          {
            action: "create",
            index: 1,
            issues: [],
            key: "page.home.hero.title",
            locale: "en-US",
          },
        ],
        summary: {
          blockedCount: 0,
          createCount: 1,
          duplicateCount: 0,
          errorCount: 1,
          totalEntries: 2,
          updateCount: 0,
        },
      },
    }),
    null,
  );
});
