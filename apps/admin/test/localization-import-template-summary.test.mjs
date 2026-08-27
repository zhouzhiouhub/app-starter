import assert from "node:assert/strict";
import test from "node:test";
import {
  readTranslationImportTemplateEmptyStateMessage,
  readTranslationImportTemplateSeverity,
  summarizeTranslationImportTemplate,
} from "../src/features/localization/translation-import-template-summary.ts";

test("translation import template summary tracks missing key draft coverage", () => {
  const summary = summarizeTranslationImportTemplate({
    defaultLocale: "en-US",
    importText: JSON.stringify({
      entries: [
        {
          context: "page.home.hero / title",
          key: "page.home.hero.title",
          locale: "en-US",
          value: "",
        },
        {
          key: "page.home.hero.body",
          value: "Body",
        },
      ],
    }),
    missingKeys: [
      "page.home.hero.title",
      "page.home.hero.body",
      "page.home.hero.cta",
    ],
  });

  assert.equal(summary.blankValueCount, 1);
  assert.equal(summary.coveredMissingKeyCount, 2);
  assert.equal(summary.remainingMissingKeyCount, 1);
  assert.equal(readTranslationImportTemplateSeverity(summary), "warning");
});

test("translation import template summary flags local import blockers", () => {
  const summary = summarizeTranslationImportTemplate({
    defaultLocale: "en-US",
    importText: JSON.stringify({
      entries: [
        { key: "page.home.hero.title", locale: "de-DE", value: "Titel" },
        { key: "page.home.hero.title", value: "Title" },
        { key: "page.home.hero.title", value: "Duplicate title" },
        { key: "Page.Home.Hero.Title", value: "Bad key" },
        null,
      ],
    }),
  });

  assert.equal(summary.duplicateKeyCount, 1);
  assert.equal(summary.invalidKeyCount, 1);
  assert.equal(summary.malformedEntryCount, 1);
  assert.equal(summary.nonDefaultLocaleCount, 1);
  assert.equal(readTranslationImportTemplateSeverity(summary), "warning");
});

test("translation import template summary separates JSON and envelope errors", () => {
  const invalidJson = summarizeTranslationImportTemplate({
    defaultLocale: "en-US",
    importText: "{",
    missingKeys: ["page.home.hero.title"],
  });
  const invalidEnvelope = summarizeTranslationImportTemplate({
    defaultLocale: "en-US",
    importText: JSON.stringify({ rows: [] }),
    missingKeys: ["page.home.hero.title"],
  });

  assert.equal(invalidJson.invalidJson, true);
  assert.equal(invalidJson.remainingMissingKeyCount, 1);
  assert.equal(invalidEnvelope.invalidEnvelope, true);
  assert.equal(readTranslationImportTemplateSeverity(invalidJson), "error");
  assert.equal(readTranslationImportTemplateSeverity(invalidEnvelope), "error");
});

test("translation import template summary explains empty import drafts", () => {
  const emptySummary = summarizeTranslationImportTemplate({
    defaultLocale: "en-US",
    importText: JSON.stringify({ entries: [] }),
  });
  const invalidSummary = summarizeTranslationImportTemplate({
    defaultLocale: "en-US",
    importText: "{",
  });

  assert.equal(
    readTranslationImportTemplateEmptyStateMessage({
      defaultLocale: "en-US",
      summary: emptySummary,
    }),
    "No import rows are queued for default en-US. Add at least one entries[] item before previewing or importing.",
  );
  assert.equal(
    readTranslationImportTemplateEmptyStateMessage({
      defaultLocale: "en-US",
      summary: invalidSummary,
    }),
    null,
  );
});
