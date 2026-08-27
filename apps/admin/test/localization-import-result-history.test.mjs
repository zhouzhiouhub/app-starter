import assert from "node:assert/strict";
import test from "node:test";
import {
  addTranslationImportResultHistoryEntry,
  clearTranslationImportResultHistory,
  createTranslationImportResultHistoryEntry,
  filterTranslationImportResultHistoryEntries,
  formatTranslationBulkRepairCleanupSuggestion,
  formatTranslationBulkRepairServerConfirmationMessage,
  formatTranslationBulkRepairCompletionMessage,
  formatTranslationBulkRetryError,
  formatTranslationImportHistoryDraftMessage,
  formatTranslationImportHistoryReplayCleanupSuggestion,
  formatTranslationImportHistoryReplayMessage,
  readTranslationBulkRepairCoveredMissingKeys,
  readTranslationBulkRepairRemainingKeys,
  readTranslationImportResultHistoryFilterOptions,
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

test("translation import result history can be cleared", () => {
  assert.deepEqual(clearTranslationImportResultHistory(), []);
});

test("translation import result history filters entries by details", () => {
  const created = createTranslationImportResultHistoryEntry(
    createImportResult(["page.home.hero.title"]),
    1,
  );
  const updated = createTranslationImportResultHistoryEntry(
    {
      entries: [
        {
          action: "update",
          index: 0,
          key: "page.home.hero.body",
          locale: "en-US",
          value: "Body",
        },
      ],
      summary: {
        createdCount: 0,
        importedCount: 1,
        totalEntries: 1,
        updatedCount: 1,
      },
    },
    2,
  );

  assert.deepEqual(
    filterTranslationImportResultHistoryEntries(
      [created, updated],
      "create",
    ).map((entry) => entry.label),
    ["Import #1"],
  );
  assert.deepEqual(
    readTranslationImportResultHistoryFilterOptions([created, updated]),
    [
      { count: 2, label: "All", value: "all" },
      { count: 1, label: "Created", value: "create" },
      { count: 1, label: "Updated", value: "update" },
    ],
  );
});

test("translation import result history explains replayed results", () => {
  assert.equal(
    formatTranslationImportHistoryReplayMessage(
      createTranslationImportResultHistoryEntry(
        createImportResult(["page.home.hero.title"]),
        2,
      ),
    ),
    "Viewing Import #2 from recent import history. This only replays the result table and does not re-import data.",
  );
  assert.equal(
    formatTranslationImportHistoryReplayMessage(
      createTranslationImportResultHistoryEntry(
        createImportResult(["page.home.hero.title"]),
        3,
      ),
      { focusKey: "page.home.hero.title" },
    ),
    "Viewing Import #3 from recent import history. This only replays the result table and does not re-import data. Translations table is focused on page.home.hero.title.",
  );
});

test("translation import result history explains draft rebuilds", () => {
  assert.equal(
    formatTranslationImportHistoryDraftMessage(
      createTranslationImportResultHistoryEntry(
        createImportResult(["page.home.hero.title", "section.faq.answer"]),
        2,
      ),
    ),
    "Draft rebuilt from Import #2 with 2 imported rows. Import preview is reset.",
  );
});

test("translation import result history explains replay cleanup", () => {
  assert.equal(
    formatTranslationImportHistoryReplayCleanupSuggestion({ historyCount: 2 }),
    "History replay is visible. Clear 2 recent import results and the replayed result after confirming the table focus.",
  );
  assert.equal(
    formatTranslationImportHistoryReplayCleanupSuggestion({ historyCount: 0 }),
    null,
  );
});

test("translation bulk repair cleanup suggestion follows history availability", () => {
  assert.equal(
    formatTranslationBulkRepairCleanupSuggestion({ historyCount: 2 }),
    "Server confirmation is complete. Clear 2 recent import results when you no longer need replay.",
  );
  assert.equal(
    formatTranslationBulkRepairCleanupSuggestion({ historyCount: 0 }),
    null,
  );
});

test("translation bulk repair coverage returns visible missing keys only when complete", () => {
  assert.deepEqual(
    readTranslationBulkRepairCoveredMissingKeys({
      missingKeys: ["page.home.hero.title", "section.faq.answer"],
      result: createImportResult([
        "page.home.hero.title",
        "section.faq.answer",
      ]),
    }),
    ["page.home.hero.title", "section.faq.answer"],
  );
  assert.deepEqual(
    readTranslationBulkRepairCoveredMissingKeys({
      missingKeys: ["page.home.hero.title", "section.faq.answer"],
      result: createImportResult(["page.home.hero.title"]),
    }),
    [],
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

test("translation bulk repair server confirmation reports focused success", () => {
  assert.equal(
    formatTranslationBulkRepairServerConfirmationMessage({
      focusKey: "page.home.hero.title",
      locale: "en-US",
      missingKeys: [],
      repairedKeys: ["page.home.hero.title", "section.faq.answer"],
    }),
    "Server confirmed 2 repaired keys for default en-US. Translations table is focused on page.home.hero.title.",
  );
});

test("translation bulk repair server confirmation reports retryable leftovers", () => {
  assert.deepEqual(
    readTranslationBulkRepairRemainingKeys({
      missingKeys: ["section.faq.answer"],
      repairedKeys: ["page.home.hero.title", "section.faq.answer"],
    }),
    ["section.faq.answer"],
  );
  assert.equal(
    formatTranslationBulkRepairServerConfirmationMessage({
      locale: "en-US",
      missingKeys: ["section.faq.answer"],
      repairedKeys: ["page.home.hero.title", "section.faq.answer"],
    }),
    "Server still reports 1 repaired key as missing for default en-US. Refresh again or retry the import after checking the payload.",
  );
});

test("translation bulk action errors include retry hints", () => {
  assert.equal(
    formatTranslationBulkRetryError({
      action: "preview-import",
      message: "Import preview JSON could not be parsed.",
    }),
    "Import preview JSON could not be parsed. Check the JSON, then retry Preview import.",
  );
  assert.equal(
    formatTranslationBulkRetryError({
      action: "download",
      message: "Export failed.",
    }),
    "Export failed. Refresh filters, then retry Export JSON.",
  );
});
