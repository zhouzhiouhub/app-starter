import assert from "node:assert/strict";
import test from "node:test";
import { formatDefaultLocaleImportConfirmationSummary } from "../src/features/localization/translation-import-confirmation.ts";

test("default locale import confirmation summarizes drafts before preview", () => {
  assert.equal(
    formatDefaultLocaleImportConfirmationSummary({
      defaultLocale: "en-US",
      importText: JSON.stringify({
        entries: [
          {
            key: "page.home.hero.title",
            locale: "en-US",
            value: "Title",
          },
          {
            key: "section.faq.answer",
            locale: "fr-FR",
            value: "Reponse",
          },
        ],
      }),
      missingKeys: ["page.home.hero.title"],
    }),
    "Draft summary: 2 rows, 1 missing key covered, 1 local blocker. Run Preview import before confirming create/update counts.",
  );
});

test("default locale import confirmation uses latest clean preview", () => {
  assert.equal(
    formatDefaultLocaleImportConfirmationSummary({
      defaultLocale: "en-US",
      importText: JSON.stringify({
        entries: [
          {
            key: "page.home.hero.title",
            locale: "en-US",
            value: "Title",
          },
          {
            key: "section.faq.answer",
            locale: "en-US",
            value: "Answer",
          },
        ],
      }),
      missingKeys: ["page.home.hero.title", "section.faq.answer"],
      preview: {
        entries: [],
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
    "Draft summary: 2 rows, 2 missing keys covered, 0 local blockers. Latest preview: 1 create, 1 update, 0 blocked/duplicate/error. Import writes only default en-US rows.",
  );
});

test("default locale import confirmation flags preview blockers", () => {
  assert.equal(
    formatDefaultLocaleImportConfirmationSummary({
      defaultLocale: "en-US",
      importText: JSON.stringify({
        entries: [
          {
            key: "page.home.hero.title",
            locale: "en-US",
            value: "Title",
          },
        ],
      }),
      preview: {
        entries: [],
        summary: {
          blockedCount: 1,
          createCount: 0,
          duplicateCount: 1,
          errorCount: 0,
          totalEntries: 2,
          updateCount: 0,
        },
      },
    }),
    "Draft summary: 1 row, 0 missing keys covered, 0 local blockers. Latest preview: 0 create, 0 update, 2 blocked/duplicate/error. Fix preview issues before importing default en-US.",
  );
});

test("default locale import confirmation rejects invalid drafts", () => {
  assert.equal(
    formatDefaultLocaleImportConfirmationSummary({
      defaultLocale: "en-US",
      importText: "{",
    }),
    "Draft is not valid JSON. Import will be blocked until the payload is fixed and previewed.",
  );
});
