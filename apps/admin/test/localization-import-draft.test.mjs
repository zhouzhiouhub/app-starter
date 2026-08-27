import assert from "node:assert/strict";
import test from "node:test";
import {
  createMissingTranslationImportDraft,
  createTranslationImportDraftFromEntries,
  defaultTranslationImportText,
  formatTranslationImportDraftNotice,
  formatTranslationImportDraft,
} from "../src/features/localization/translation-import-draft.ts";

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
