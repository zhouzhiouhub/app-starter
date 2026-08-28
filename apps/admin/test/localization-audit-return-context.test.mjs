import assert from "node:assert/strict";
import test from "node:test";
import {
  appendTranslationAuditReturnContext,
  clearTranslationAuditReturnContext,
  readTranslationAuditReturnContext,
} from "../src/features/localization/translation-audit-return-context.ts";

test("translation audit return context explains import audit jumps", () => {
  assert.deepEqual(
    readTranslationAuditReturnContext(
      new URLSearchParams("auditReturn=translation-imported"),
      {},
    ),
    {
      description:
        "Showing default Locale translations. Import audit rows record counts, actor, request, and target without translation values.",
      message: "Returned from translation import audit",
      source: "translation-imported",
      type: "info",
    },
  );
});

test("translation audit return context explains restored export filters", () => {
  assert.deepEqual(
    readTranslationAuditReturnContext(
      new URLSearchParams("auditReturn=translation-exported"),
      {
        namespace: "page.home",
        query: "hero",
      },
    ),
    {
      description:
        "Showing default Locale translations from audited export filters: namespace=page.home, q=hero.",
      message: "Returned from translation export audit",
      source: "translation-exported",
      type: "info",
    },
  );
});

test("translation audit return context ignores invalid sources", () => {
  assert.equal(
    readTranslationAuditReturnContext(
      new URLSearchParams("auditReturn=page-published"),
      {},
    ),
    null,
  );
});

test("translation audit return context appends and clears only context params", () => {
  const search = appendTranslationAuditReturnContext(
    "namespace=page.home&q=hero",
    "translation-exported",
  );

  assert.equal(
    search,
    "namespace=page.home&q=hero&auditReturn=translation-exported",
  );
  assert.equal(
    clearTranslationAuditReturnContext(new URLSearchParams(search)),
    "namespace=page.home&q=hero",
  );
});
