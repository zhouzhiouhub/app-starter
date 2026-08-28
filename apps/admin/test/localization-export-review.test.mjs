import assert from "node:assert/strict";
import test from "node:test";
import { createTranslationExportSuccessReviewNotice } from "../src/features/localization/translation-export-review.ts";

test("translation export review summarizes default locale download", () => {
  assert.deepEqual(
    createTranslationExportSuccessReviewNotice({
      filters: {},
      result: {
        contentType: "application/json",
        entries: [],
        entryCount: 2,
        expectedKeyCount: 2,
        exportVersion: "translation-export.v1",
        filename: "translations-en-US.json",
        format: "json",
        locale: "en-US",
        missingKeyCount: 0,
        missingKeyPreviewLimit: 0,
        missingKeys: [],
      },
    }),
    {
      message:
        "Export review: 2 default en-US rows downloaded as translations-en-US.json. Audit replay keeps the default Locale export scope.",
      type: "success",
    },
  );
});

test("translation export review includes filters and missing key count", () => {
  assert.deepEqual(
    createTranslationExportSuccessReviewNotice({
      filters: {
        namespace: "page.home",
        query: "hero",
      },
      result: {
        contentType: "application/json",
        entries: [],
        entryCount: 1,
        expectedKeyCount: 3,
        exportVersion: "translation-export.v1",
        filename: "translations-en-US.json",
        format: "json",
        locale: "en-US",
        missingKeyCount: 2,
        missingKeyPreviewLimit: 10,
        missingKeys: ["page.home.hero.title", "page.home.hero.body"],
      },
    }),
    {
      message:
        "Export review: 1 default en-US row downloaded as translations-en-US.json. Audit replay keeps the export filters (namespace=page.home, q=hero). 2 expected keys still missing.",
      type: "success",
    },
  );
});
