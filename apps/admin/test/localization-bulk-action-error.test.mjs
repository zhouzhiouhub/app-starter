import assert from "node:assert/strict";
import test from "node:test";
import { readTranslationBulkActionError } from "../src/features/localization/translation-bulk-action-error.ts";

test("translation bulk action errors explain parse failures with retry hints", () => {
  assert.equal(
    readTranslationBulkActionError("preview-import", new SyntaxError("bad")),
    "Import preview JSON could not be parsed. Check the JSON, then retry Preview import.",
  );
});

test("translation bulk action errors explain request failures with action hints", () => {
  assert.equal(
    readTranslationBulkActionError("import", new Error("Import failed.")),
    "Import failed. Check the import payload, then retry Import default locale.",
  );
});
