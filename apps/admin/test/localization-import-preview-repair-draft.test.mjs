import assert from "node:assert/strict";
import test from "node:test";
import {
  createTranslationImportPreviewRepairDraftState,
  formatTranslationImportPreviewRepairDraftDetailMessage,
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
  assert.equal(
    state.detailMessage,
    "Repair draft keeps entries[0] and entries[1]. Skipped rows needing edits: entries[2] section.faq.answer [en-US] (duplicate: Duplicate row.).",
  );
  assert.equal(
    state.notice,
    "Draft rebuilt from 2 import preview repair rows for default en-US. Blocked, duplicate, and error rows are left out; run Preview import again before importing. Repair draft keeps entries[0] and entries[1]. Skipped rows needing edits: entries[2] section.faq.answer [en-US] (duplicate: Duplicate row.).",
  );
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
  assert.equal(
    state.detailMessage,
    "Repair draft has no importable default Locale rows. Skipped rows needing edits: entries[0] Page.Home.Title [en-US] (create: Draft row could not be rebuilt; check key, locale, and value.); entries[1] page.home.hero.title [fr-FR] (create: Non-default Locale rows are left out while multi-locale is disabled.).",
  );
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

test("translation import preview repair details summarize long issue lists", () => {
  assert.equal(
    formatTranslationImportPreviewRepairDraftDetailMessage({
      issueDetails: [
        {
          action: "error",
          index: 3,
          key: "page.a",
          locale: "en-US",
          message: "A.",
        },
        {
          action: "duplicate",
          index: 4,
          key: "page.b",
          locale: "en-US",
          message: "B.",
        },
        {
          action: "blocked",
          index: 5,
          key: "page.c",
          locale: "fr-FR",
          message: "C.",
        },
        {
          action: "error",
          index: 6,
          key: "page.d",
          locale: "en-US",
          message: "D.",
        },
      ],
      keptIndexes: [0, 1, 2],
    }),
    "Repair draft keeps entries[0], entries[1], and entries[2]. Skipped rows needing edits: entries[3] page.a [en-US] (error: A.); entries[4] page.b [en-US] (duplicate: B.); entries[5] page.c [fr-FR] (blocked: C.); +1 more.",
  );
});
