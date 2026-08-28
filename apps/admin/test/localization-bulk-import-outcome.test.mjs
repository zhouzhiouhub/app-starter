import assert from "node:assert/strict";
import test from "node:test";
import {
  readTranslationBulkImportFailureFeedback,
  readTranslationBulkImportSuccessFeedback,
} from "../src/features/localization/translation-bulk-import-outcome.ts";
import { createApiRequestError } from "../src/lib/api-error.ts";

test("translation bulk import success feedback combines review and repair state", () => {
  const feedback = readTranslationBulkImportSuccessFeedback({
    locale: "en-US",
    missingKeys: ["page.home.hero.title"],
    result: {
      entries: [
        {
          action: "create",
          index: 0,
          key: "page.home.hero.title",
          locale: "en-US",
          value: "Title",
        },
      ],
      summary: {
        createdCount: 1,
        importedCount: 1,
        totalEntries: 1,
        updatedCount: 0,
      },
    },
  });

  assert.equal(feedback.focusKey, "page.home.hero.title");
  assert.deepEqual(feedback.repairedKeys, ["page.home.hero.title"]);
  assert.equal(
    feedback.reviewNotice.message,
    "Import review: 1 default en-US row saved (1 created, 0 updated). Review page.home.hero.title in the translations table, then refresh missing keys if this import was a repair.",
  );
});

test("translation bulk import failure feedback preserves safe row details", () => {
  const failure = readTranslationBulkImportFailureFeedback({
    caught: createApiRequestError(
      {
        error: {
          details: {
            entries: [
              {
                action: "error",
                index: 0,
                issues: [{ code: "INVALID_KEY", message: "Invalid key." }],
                key: "Page.Home.Title",
                locale: "en-US",
                value: "secret",
              },
            ],
          },
        },
      },
      "Import failed.",
    ),
    locale: "en-US",
  });

  assert.equal(
    failure.message,
    "Import failed. Check the import payload, then retry Import default locale.",
  );
  assert.equal(failure.details?.entries[0]?.key, "Page.Home.Title");
  assert.equal(JSON.stringify(failure.details).includes("secret"), false);
  assert.equal(failure.reviewNotice.type, "error");
});
