import assert from "node:assert/strict";
import test from "node:test";
import {
  createMissingTranslationImportDraft,
  createTranslationImportDraftFromEntries,
  defaultTranslationImportText,
  emptyTranslationImportText,
  formatTranslationImportDraftClearedNotice,
  formatTranslationImportDraftClearSuggestion,
  formatTranslationImportDraftNotice,
  formatTranslationImportDraft,
} from "../src/features/localization/translation-import-draft.ts";
import {
  createHistoryTranslationImportDraftState,
  createMissingTranslationImportDraftState,
  createResultTranslationImportDraftState,
  formatMissingTranslationImportDraftFilterNotice,
  formatTranslationImportDedupedDraftNotice,
} from "../src/features/localization/translation-import-draft-state.ts";
import { createTranslationImportResultHistoryEntry } from "../src/features/localization/translation-import-result-history.ts";

test("missing translation import drafts create editable default locale entries", () => {
  assert.deepEqual(
    createMissingTranslationImportDraft(
      [
        "page.home.hero.title",
        " page.home.hero.title ",
        "Page.Home.Hero.Body",
        "section.faq.answer",
      ],
      "en-US",
    ),
    {
      entries: [
        {
          context: "page.home.hero / title",
          key: "page.home.hero.title",
          locale: "en-US",
          value: "",
        },
        {
          context: "section.faq / answer",
          key: "section.faq.answer",
          locale: "en-US",
          value: "",
        },
      ],
    },
  );
});

test("missing translation import drafts serialize stable JSON", () => {
  assert.equal(
    formatTranslationImportDraft(
      createMissingTranslationImportDraft(["page.home.hero.title"], "en-US"),
    ),
    [
      "{",
      '  "entries": [',
      "    {",
      '      "context": "page.home.hero / title",',
      '      "key": "page.home.hero.title",',
      '      "locale": "en-US",',
      '      "value": ""',
      "    }",
      "  ]",
      "}",
    ].join("\n"),
  );
});

test("translation import drafts can be rebuilt from selected result rows", () => {
  assert.deepEqual(
    createTranslationImportDraftFromEntries([
      {
        context: null,
        key: "page.home.hero.title",
        locale: "en-US",
        value: "Title",
      },
      {
        context: "Existing context",
        key: "page.home.hero.title",
        locale: "en-US",
        value: "Duplicate",
      },
      {
        key: "Page.Home.Hero.Body",
        locale: "en-US",
        value: "Bad key",
      },
    ]),
    {
      entries: [
        {
          context: "page.home.hero / title",
          key: "page.home.hero.title",
          locale: "en-US",
          value: "Title",
        },
      ],
    },
  );
});

test("default translation import text stays importable", () => {
  assert.deepEqual(JSON.parse(defaultTranslationImportText), {
    entries: [
      {
        context: "",
        key: "page.home.hero.title",
        locale: "en-US",
        value: "Build better storefronts",
      },
    ],
  });
});

test("empty translation import text can clear successful payload drafts", () => {
  assert.deepEqual(JSON.parse(emptyTranslationImportText), {
    entries: [],
  });
});

test("translation import draft notices explain reset preview state", () => {
  assert.equal(
    formatTranslationImportDraftNotice({
      entryCount: 2,
      source: "import-result",
    }),
    "Draft rebuilt from 2 imported rows. Import preview is reset.",
  );
  assert.equal(
    formatTranslationImportDraftNotice({
      entryCount: 1,
      source: "missing-keys",
    }),
    "Draft rebuilt from 1 missing key. Import preview is reset.",
  );
});

test("missing translation import draft notices explain filtered focus", () => {
  assert.equal(
    formatMissingTranslationImportDraftFilterNotice({
      entryCount: 2,
      filters: {
        namespace: "page.home",
        query: "hero",
      },
    }),
    "Draft uses current translation filters (namespace=page.home, q=hero). After import, the translations table will focus the first repaired key and may update filters to that key.",
  );
  assert.equal(
    formatMissingTranslationImportDraftFilterNotice({
      entryCount: 2,
      filters: {},
    }),
    null,
  );
  assert.equal(
    formatMissingTranslationImportDraftFilterNotice({
      entryCount: 0,
      filters: {
        query: "hero",
      },
    }),
    null,
  );
});

test("translation import draft clear messages explain follow-up actions", () => {
  assert.equal(
    formatTranslationImportDraftClearSuggestion({ importedCount: 2 }),
    "Import succeeded for 2 rows. Clear the draft when you no longer need this payload.",
  );
  assert.equal(
    formatTranslationImportDraftClearSuggestion({ importedCount: 1 }),
    "Import succeeded for 1 row. Clear the draft when you no longer need this payload.",
  );
  assert.equal(
    formatTranslationImportDraftClearedNotice({ locale: "en-US" }),
    "Import draft was cleared after the successful default en-US import.",
  );
});

test("translation import draft states carry text and notices", () => {
  const resultEntries = [
    {
      action: "create",
      context: null,
      index: 0,
      key: "page.home.hero.title",
      locale: "en-US",
      value: "Title",
    },
  ];

  assert.deepEqual(
    JSON.parse(
      createMissingTranslationImportDraftState({
        keys: ["page.home.hero.title"],
        locale: "en-US",
      }).text,
    ),
    {
      entries: [
        {
          context: "page.home.hero / title",
          key: "page.home.hero.title",
          locale: "en-US",
          value: "",
        },
      ],
    },
  );
  assert.equal(
    createMissingTranslationImportDraftState({
      filters: {
        namespace: "page.home",
        query: "hero",
      },
      keys: ["page.home.hero.title"],
      locale: "en-US",
    }).notice,
    "Draft rebuilt from 1 missing key. Import preview is reset. Draft uses current translation filters (namespace=page.home, q=hero). After import, the translations table will focus the first repaired key and may update filters to that key.",
  );
  assert.equal(
    createResultTranslationImportDraftState(resultEntries).notice,
    "Draft rebuilt from 1 imported row. Import preview is reset.",
  );
  assert.equal(
    createResultTranslationImportDraftState([
      ...resultEntries,
      {
        action: "update",
        context: "Existing context",
        index: 1,
        key: "page.home.hero.title",
        locale: "en-US",
        value: "Duplicate",
      },
    ]).notice,
    "Draft rebuilt from 1 imported row. Import preview is reset. 1 duplicate or invalid row was left out.",
  );
  assert.equal(
    createHistoryTranslationImportDraftState(
      createTranslationImportResultHistoryEntry(
        {
          entries: resultEntries,
          summary: {
            createdCount: 1,
            importedCount: 1,
            totalEntries: 1,
            updatedCount: 0,
          },
        },
        2,
      ),
    ).notice,
    "Draft rebuilt from Import #2 with 1 imported row. Import preview is reset.",
  );
});

test("translation import deduped draft notices explain skipped rows", () => {
  assert.equal(
    formatTranslationImportDedupedDraftNotice({
      entryCount: 1,
      skippedCount: 2,
    }),
    "Draft rebuilt from 1 imported row. Import preview is reset. 2 duplicate or invalid rows were left out.",
  );
});
