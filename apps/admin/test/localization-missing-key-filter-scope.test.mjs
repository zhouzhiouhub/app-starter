import assert from "node:assert/strict";
import test from "node:test";
import { formatMissingTranslationKeyFilterScopeMessage } from "../src/features/localization/missing-translation-key-filter-scope.ts";

test("missing translation key filter scope message explains active filters", () => {
  assert.equal(
    formatMissingTranslationKeyFilterScopeMessage({
      namespace: "page.home",
      query: "hero",
    }),
    "Missing key pages follow current translation filters (namespace=page.home, q=hero). Clear filters to review every visible missing key; remembered page is clamped when filters change.",
  );
});

test("missing translation key filter scope message stays hidden without filters", () => {
  assert.equal(formatMissingTranslationKeyFilterScopeMessage({}), null);
});
