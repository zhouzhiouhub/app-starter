import assert from "node:assert/strict";
import test from "node:test";
import {
  createTranslationImportFailureReviewNotice,
  createTranslationImportSuccessReviewNotice,
} from "../src/features/localization/translation-import-review.ts";

test("translation import success review summarizes saved rows and focus", () => {
  assert.deepEqual(
    createTranslationImportSuccessReviewNotice({
      focusKey: "page.home.hero.title",
      locale: "en-US",
      result: {
        entries: [],
        summary: {
          createdCount: 1,
          importedCount: 2,
          totalEntries: 2,
          updatedCount: 1,
        },
      },
    }),
    {
      message:
        "Import review: 2 default en-US rows saved (1 created, 1 updated). Review page.home.hero.title in the translations table, then refresh missing keys if this import was a repair.",
      type: "success",
    },
  );
});

test("translation import failure review summarizes blocked preview rows", () => {
  assert.deepEqual(
    createTranslationImportFailureReviewNotice({
      details: {
        entries: [
          {
            action: "blocked",
            index: 0,
            issues: [
              {
                code: "MULTI_LOCALE_DISABLED",
                message: "Only the default Locale can be imported.",
              },
            ],
            key: "page.home.hero.title",
            locale: "fr-FR",
          },
          {
            action: "duplicate",
            index: 1,
            issues: [{ code: "DUPLICATE", message: "Duplicate row." }],
            key: "page.home.hero.title",
            locale: "en-US",
          },
        ],
        summary: {
          blockedCount: 1,
          createCount: 0,
          duplicateCount: 1,
          errorCount: 0,
          totalEntries: 2,
          updateCount: 0,
        },
      },
      locale: "en-US",
    }),
    {
      message:
        "Import review: no default en-US rows were saved. 2 preview rows need repair before retrying; first issue: Only the default Locale can be imported.",
      type: "error",
    },
  );
});

test("translation import failure review falls back without row details", () => {
  assert.deepEqual(
    createTranslationImportFailureReviewNotice({
      locale: "en-US",
    }),
    {
      message:
        "Import review: no default en-US rows were saved. Check the error, update the draft, and run Preview import before retrying.",
      type: "error",
    },
  );
});
