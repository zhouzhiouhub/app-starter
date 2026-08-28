import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMissingTranslationKeyFillHint,
  formatMissingTranslationKeyQueueNavigationHint,
  formatTranslationImportHistoryActionHint,
  formatTranslationImportResultFocusHint,
} from "../src/features/localization/translation-key-action-hints.ts";

const historyEntry = {
  id: "1",
  label: "Import #1",
  result: {
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
  },
};

test("translation import history action hints summarize row keys", () => {
  assert.equal(
    formatTranslationImportHistoryActionHint({
      action: "view",
      entry: historyEntry,
    }),
    "Import #1 contains 2 keys (first page.home.hero.title). View replays the saved result table without importing data.",
  );
  assert.equal(
    formatTranslationImportHistoryActionHint({
      action: "draft",
      entry: historyEntry,
    }),
    "Import #1 contains 2 keys (first page.home.hero.title). Draft rebuilds editable default Locale rows from these imported keys.",
  );
});

test("translation import result focus hints reflect source and current focus", () => {
  assert.equal(
    formatTranslationImportResultFocusHint({
      focusSource: "history",
      key: "page.home.hero.title",
    }),
    "Focus page.home.hero.title from this history replay; no data is re-imported.",
  );
  assert.equal(
    formatTranslationImportResultFocusHint({
      isFocused: true,
      key: "page.home.hero.title",
    }),
    "page.home.hero.title is already focused in the translations table.",
  );
});

test("missing translation key action hints identify the target key", () => {
  assert.equal(
    formatMissingTranslationKeyFillHint({
      key: " page.home.hero.title ",
      locale: "en-US",
    }),
    "Fill default en-US for page.home.hero.title; the form and translation filters will move to this key.",
  );
  assert.equal(
    formatMissingTranslationKeyQueueNavigationHint({
      action: "next",
      key: "section.faq.answer",
      locale: "en-US",
    }),
    "Move to next missing key section.faq.answer for default en-US.",
  );
});
