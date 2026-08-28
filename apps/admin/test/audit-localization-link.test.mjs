import assert from "node:assert/strict";
import test from "node:test";
import { readAuditLogLocalizationPath } from "../src/features/audit/audit-localization-link.ts";

function createAuditLog(overrides) {
  return {
    action: "translation.exported",
    actorId: "user_1",
    createdAt: "2026-08-28T00:00:00.000Z",
    id: "audit_1",
    metadata: {},
    requestId: "req_1",
    targetId: "en-US",
    targetType: "translation-export",
    ...overrides,
  };
}

test("audit localization links restore export filters", () => {
  assert.equal(
    readAuditLogLocalizationPath(
      createAuditLog({
        metadata: {
          namespace: " page.home ",
          query: " hero ",
        },
      }),
    ),
    "/localization?namespace=page.home&q=hero",
  );
});

test("audit localization links ignore unsafe export filters", () => {
  assert.equal(
    readAuditLogLocalizationPath(
      createAuditLog({
        metadata: {
          namespace: "Page.Home",
          query: "x".repeat(129),
        },
      }),
    ),
    "/localization",
  );
});

test("audit localization links open the default localization view for imports", () => {
  assert.equal(
    readAuditLogLocalizationPath(
      createAuditLog({
        action: "translation.imported",
        targetId: "translations",
        targetType: "translation-import",
      }),
    ),
    "/localization",
  );
});

test("audit localization links ignore unrelated audit rows", () => {
  assert.equal(
    readAuditLogLocalizationPath(
      createAuditLog({
        action: "page.published",
        targetId: "page_1",
        targetType: "page",
      }),
    ),
    null,
  );
});
