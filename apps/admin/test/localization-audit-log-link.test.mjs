import assert from "node:assert/strict";
import test from "node:test";
import { auditActionOptions } from "../src/features/audit/constants.ts";
import {
  buildTranslationExportAuditLogPath,
  buildTranslationImportAuditLogPath,
} from "../src/features/localization/translation-audit-log-link.ts";

test("translation audit log links target import and export audit filters", () => {
  assert.equal(
    buildTranslationImportAuditLogPath(),
    "/audit-logs?action=translation.imported&targetId=translations&targetType=translation-import",
  );
  assert.equal(
    buildTranslationExportAuditLogPath("en-US"),
    "/audit-logs?action=translation.exported&targetId=en-US&targetType=translation-export",
  );
});

test("translation audit log links sanitize unsafe locales", () => {
  assert.equal(
    buildTranslationExportAuditLogPath("en-US?debug=true"),
    "/audit-logs?action=translation.exported&targetId=en-US&targetType=translation-export",
  );
});

test("audit action options expose translation import and export filters", () => {
  assert.deepEqual(
    auditActionOptions.filter((option) =>
      option.value.startsWith("translation."),
    ),
    [
      { label: "Translation imported", value: "translation.imported" },
      { label: "Translation exported", value: "translation.exported" },
    ],
  );
});
