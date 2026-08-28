import assert from "node:assert/strict";
import test from "node:test";
import {
  createTranslationImportPreviewRepairDraftState,
  formatTranslationImportPreviewRepairDraftNotice,
} from "../src/features/localization/translation-import-preview-repair-draft.ts";

test("translation import preview repair draft keeps create and update rows", () => {
  const state = createTranslationImportPreviewRepairDraftState({
    defaultLocale: "en-US",
    importText: JSON.stringify({
      entries: [
        {
          context: "page.home.hero / title",
          key: "page.home.hero.title",
          locale: "en-US",
          value: "Title",
        },
        {
          context: "section.faq / answer",
          key: "section.faq.answer",
          locale: "en-US",
          value: "Answer",
        },
        {
          key: "section.faq.answer",
          locale: "en-US",
          value: "Duplicate",
        },
      ],
    }),
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
        {
          action: "duplicate",
          index: 2,
          issues: [{ code: "DUPLICATE", message: "Duplicate row." }],
          key: "section.faq.answer",
          locale: "en-US",
        },
      ],
      summary: {
        blockedCount: 0,
        createCount: 1,
        duplicateCount: 1,
        errorCount: 0,
        totalEntries: 3,
        updateCount: 1,
      },
    },
  });

  assert.equal(state.entryCount, 2);
  assert.deepEqual(JSON.parse(state.text), {
    entries: [
      {
        context: "page.home.hero / title",
        key: "page.home.hero.title",
        locale: "en-US",
        value: "Title",
      },
      {
        context: "section.faq / answer",
        key: "section.faq.answer",
        locale: "en-US",
        value: "Answer",
      },
    ],
  });
});

test("translation import preview repair draft skips non-default and invalid rows", () => {
  const state = createTranslationImportPreviewRepairDraftState({
    defaultLocale: "en-US",
    importText: JSON.stringify({
      entries: [
        { key: "Page.Home.Title", locale: "en-US", value: "Bad key" },
        { key: "page.home.hero.title", locale: "fr-FR", value: "Titre" },
      ],
    }),
    preview: {
      entries: [
        {
          action: "create",
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
          locale: "fr-FR",
        },
      ],
      summary: {
        blockedCount: 0,
        createCount: 2,
        duplicateCount: 0,
        errorCount: 0,
        totalEntries: 2,
        updateCount: 0,
      },
    },
  });

  assert.equal(state.entryCount, 0);
  assert.deepEqual(JSON.parse(state.text), { entries: [] });
});

test("translation import preview repair draft notice explains reset", () => {
  assert.equal(
    formatTranslationImportPreviewRepairDraftNotice({
      entryCount: 1,
      locale: "en-US",
    }),
    "Draft rebuilt from 1 import preview repair row for default en-US. Blocked, duplicate, and error rows are left out; run Preview import again before importing.",
  );
});
