import assert from "node:assert/strict";
import test from "node:test";
import {
  addTranslationImportResultHistoryEntry,
  createTranslationImportResultHistoryEntry,
  formatTranslationBulkRepairCompletionMessage,
} from "../src/features/localization/translation-import-result-history.ts";

function createImportResult(keys) {
  return {
    entries: keys.map((key, index) => ({
      action: index === 0 ? "create" : "update",
      index,
      key,
      locale: "en-US",
      value: `Value ${index}`,
    })),
    summary: {
      createdCount: keys.length > 0 ? 1 : 0,
      importedCount: keys.length,
      totalEntries: keys.length,
      updatedCount: Math.max(0, keys.length - 1),
    },
  };
}

test("translation import result history keeps the newest entries first", () => {
  const first = createTranslationImportResultHistoryEntry(
    createImportResult(["page.home.hero.title"]),
    1,
  );
  const second = createTranslationImportResultHistoryEntry(
    createImportResult(["page.home.hero.body"]),
    2,
  );
  const third = createTranslationImportResultHistoryEntry(
    createImportResult(["section.faq.answer"]),
    3,
  );

  assert.deepEqual(
    addTranslationImportResultHistoryEntry(
      addTranslationImportResultHistoryEntry([first], second),
      third,
      2,
    ).map((entry) => entry.label),
    ["Import #3", "Import #2"],
  );
});

test("translation import result history replaces matching ids", () => {
  const first = createTranslationImportResultHistoryEntry(
    createImportResult(["page.home.hero.title"]),
    1,
  );
  const replacement = createTranslationImportResultHistoryEntry(
    createImportResult(["page.home.hero.body"]),
    1,
  );

  assert.deepEqual(
    addTranslationImportResultHistoryEntry([first], replacement).map(
      (entry) => entry.result.entries[0]?.key,
    ),
    ["page.home.hero.body"],
  );
});

test("translation bulk repair completion confirms full visible coverage", () => {
  assert.equal(
    formatTranslationBulkRepairCompletionMessage({
      locale: "en-US",
      missingKeys: ["page.home.hero.title", "section.faq.answer"],
      result: createImportResult([
        "page.home.hero.title",
        "section.faq.answer",
      ]),
    }),
    "Bulk repair covered all 2 visible missing keys for default en-US. Refresh will confirm server coverage.",
  );
});

test("translation bulk repair completion ignores partial coverage", () => {
  assert.equal(
    formatTranslationBulkRepairCompletionMessage({
      locale: "en-US",
      missingKeys: ["page.home.hero.title", "section.faq.answer"],
      result: createImportResult(["page.home.hero.title"]),
    }),
    null,
  );
});
