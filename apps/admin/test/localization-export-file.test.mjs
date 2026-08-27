import assert from "node:assert/strict";
import test from "node:test";
import { createTranslationExportFile } from "../src/features/localization/translation-export-file.ts";

const exportResult = {
  contentType: "application/json",
  entries: [
    {
      context: "Homepage hero",
      key: "page.home.hero.title",
      locale: "en-US",
      updatedAt: "2026-08-27T00:00:00.000Z",
      value: "Build better storefronts",
    },
  ],
  entryCount: 1,
  expectedKeyCount: 2,
  exportVersion: "translation-export.v1",
  filename: "translations-en-US.json",
  format: "json",
  locale: "en-US",
  missingKeyCount: 1,
  missingKeyPreviewLimit: 50,
  missingKeys: ["page.home.hero.body"],
};

test("translation export files serialize the importable envelope", () => {
  const file = createTranslationExportFile(exportResult);
  const envelope = JSON.parse(file.text);

  assert.equal(file.contentType, "application/json");
  assert.equal(file.filename, "translations-en-US.json");
  assert.deepEqual(envelope, {
    entries: exportResult.entries,
    entryCount: 1,
    expectedKeyCount: 2,
    exportVersion: "translation-export.v1",
    locale: "en-US",
    missingKeyCount: 1,
    missingKeyPreviewLimit: 50,
    missingKeys: ["page.home.hero.body"],
  });
});

test("translation export files ignore unsafe server filenames", () => {
  const file = createTranslationExportFile({
    ...exportResult,
    filename: "../translations.json",
  });

  assert.equal(file.filename, "translations-en-US.json");
});
