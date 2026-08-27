import assert from "node:assert/strict";
import test from "node:test";
import { readTranslationImportErrorDetails } from "../src/features/localization/translation-import-error-details.ts";
import { createApiRequestError } from "../src/lib/api-error.ts";

test("translation import error details expose failed rows without values", () => {
  const error = createApiRequestError(
    {
      error: {
        code: "VALIDATION_ERROR",
        details: {
          entries: [
            {
              action: "error",
              index: 1,
              issues: [
                {
                  code: "INVALID_KEY",
                  field: "key",
                  message: "Translation key is invalid.",
                },
              ],
              key: "page.home.hero.title",
              locale: "en-US",
              value: "secret translation value",
            },
            {
              action: "blocked",
              index: 2,
              issues: [
                {
                  code: "MULTI_LOCALE_DISABLED",
                  message: "Only the default Locale can be imported.",
                },
              ],
              locale: "de-DE",
            },
          ],
          summary: {
            blockedCount: 1,
            createCount: 0,
            duplicateCount: 0,
            errorCount: 1,
            totalEntries: 3,
            updateCount: 1,
          },
        },
        message: "Translation import contains invalid rows.",
      },
    },
    "Translation import could not be completed.",
  );

  const details = readTranslationImportErrorDetails(error);

  assert.deepEqual(details, {
    entries: [
      {
        action: "error",
        index: 1,
        issues: [
          {
            code: "INVALID_KEY",
            field: "key",
            message: "Translation key is invalid.",
          },
        ],
        key: "page.home.hero.title",
        locale: "en-US",
      },
      {
        action: "blocked",
        index: 2,
        issues: [
          {
            code: "MULTI_LOCALE_DISABLED",
            message: "Only the default Locale can be imported.",
          },
        ],
        locale: "de-DE",
      },
    ],
    summary: {
      blockedCount: 1,
      createCount: 0,
      duplicateCount: 0,
      errorCount: 1,
      totalEntries: 3,
      updateCount: 1,
    },
  });
  assert.equal(
    JSON.stringify(details).includes("secret translation value"),
    false,
  );
});

test("translation import error details derive a summary when needed", () => {
  const error = createApiRequestError(
    {
      error: {
        details: {
          entries: [
            {
              action: "duplicate",
              index: 0,
              issues: [{ code: "DUPLICATE", message: "Duplicate row." }],
              key: "page.home.hero.title",
              locale: "en-US",
            },
          ],
          summary: { duplicateCount: "1" },
        },
      },
    },
    "Translation import could not be completed.",
  );

  assert.deepEqual(readTranslationImportErrorDetails(error)?.summary, {
    blockedCount: 0,
    createCount: 0,
    duplicateCount: 1,
    errorCount: 0,
    totalEntries: 1,
    updateCount: 0,
  });
});

test("translation import error details ignore unrelated errors", () => {
  const errors = [
    new Error("Request failed."),
    createApiRequestError({}, "Translation import could not be completed."),
    createApiRequestError(
      { error: { details: { entries: [{ action: "error", index: 0 }] } } },
      "Translation import could not be completed.",
    ),
  ];

  for (const error of errors) {
    assert.equal(readTranslationImportErrorDetails(error), null);
  }
});
