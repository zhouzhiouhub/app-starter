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
    createResultTranslationImportDraftState(resultEntries).notice,
    "Draft rebuilt from 1 imported row. Import preview is reset.",
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
