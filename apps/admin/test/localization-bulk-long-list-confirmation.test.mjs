import assert from "node:assert/strict";
import test from "node:test";
import { formatTranslationBulkLongListConfirmation } from "../src/features/localization/translation-bulk-long-list-confirmation.ts";

const longListMeta = {
  limit: 20,
  locale: "en-US",
  page: 2,
  total: 55,
};

test("translation bulk long list confirmation stays quiet for one page", () => {
  assert.equal(
    formatTranslationBulkLongListConfirmation({
      action: "export-download",
      meta: {
        limit: 20,
        locale: "en-US",
        page: 1,
        total: 20,
      },
    }),
    null,
  );
});

test("translation bulk long list confirmation explains import scope", () => {
  assert.equal(
    formatTranslationBulkLongListConfirmation({
      action: "import",
      filters: {
        namespace: "page.home",
        query: "hero",
      },
      meta: longListMeta,
    }),
    "Long default en-US list: table page 2 shows rows 21-40 of 55 under namespace=page.home, q=hero. Import may update rows outside the visible page; latest Preview import counts are the source of truth.",
  );
});

test("translation bulk long list confirmation explains export download scope", () => {
  assert.equal(
    formatTranslationBulkLongListConfirmation({
      action: "export-download",
      exportPreview: {
        exportableEntryCount: 42,
        expectedKeyCount: 55,
        locale: "en-US",
        missingKeyCount: 13,
        missingKeyPreviewLimit: 10,
        missingKeys: [],
        sampleKeyLimit: 10,
        sampleKeys: [],
      },
      meta: longListMeta,
    }),
    "Long default en-US list: Export JSON will download 42 matching rows, not only rows 21-40 visible on page 2. Preview export first if the count looks unexpected.",
  );
});

test("translation bulk long list confirmation clamps ranges to the last page", () => {
  assert.equal(
    formatTranslationBulkLongListConfirmation({
      action: "export-download",
      meta: {
        limit: 20,
        locale: "en-US",
        page: 3,
        total: 55,
      },
    }),
    "Long default en-US list: Export JSON will download 55 matching rows, not only rows 41-55 visible on page 3. Preview export first if the count looks unexpected.",
  );
});
