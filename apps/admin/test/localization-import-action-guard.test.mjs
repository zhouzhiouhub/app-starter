import assert from "node:assert/strict";
import test from "node:test";
import { readTranslationImportDraftActionGuard } from "../src/features/localization/translation-import-action-guard.ts";

test("translation import action guard blocks empty preview runs", () => {
  assert.equal(
    readTranslationImportDraftActionGuard({
      action: "preview-import",
      defaultLocale: "en-US",
      importText: JSON.stringify({ entries: [] }),
    }),
    "No import rows are queued for default en-US. Add at least one entries[] item before previewing or importing. Preview import was not run.",
  );
});

test("translation import action guard blocks empty import runs", () => {
  assert.equal(
    readTranslationImportDraftActionGuard({
      action: "import",
      defaultLocale: "en-US",
      importText: JSON.stringify({ entries: [] }),
    }),
    "No import rows are queued for default en-US. Add at least one entries[] item before previewing or importing. Import was not run.",
  );
});

test("translation import action guard allows invalid JSON to reach parse handling", () => {
  assert.equal(
    readTranslationImportDraftActionGuard({
      action: "preview-import",
      defaultLocale: "en-US",
      importText: "{",
    }),
    null,
  );
});
