import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTranslationBulkExportConfirmationSummary,
  formatTranslationBulkImportConfirmationSummary,
} from "../src/features/localization/translation-bulk-confirmation-summary.ts";

const meta = {
  entryLimit: 1000,
  expectedKeyCount: 60,
  fallbackLocale: "en-US",
  isFallback: false,
  limit: 20,
  locale: "en-US",
  missingKeyCount: 0,
  missingKeyPreviewLimit: 10,
  missingKeys: [],
  page: 1,
  requestedLocale: "en-US",
  total: 60,
};

test("translation bulk import confirmation appends long list scope", () => {
  assert.equal(
    formatTranslationBulkImportConfirmationSummary({
      filters: {},
      importText: JSON.stringify({
        entries: [
          {
            key: "page.home.hero.title",
            locale: "en-US",
            value: "Title",
          },
        ],
      }),
      meta,
    }),
    "Draft summary: 1 row, 0 missing keys covered, 0 local blockers. Run Preview import before confirming create/update counts. Long default en-US list: table page 1 shows rows 1-20 of 60. Import may update rows outside the visible page; latest Preview import counts are the source of truth.",
  );
});

test("translation bulk export confirmation stays nullable for short lists", () => {
  assert.equal(
    formatTranslationBulkExportConfirmationSummary({
      filters: {},
      meta: {
        ...meta,
        total: 20,
      },
    }),
    null,
  );
});
