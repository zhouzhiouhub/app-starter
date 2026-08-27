import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMissingTranslationKeyFilterRestoreMessage,
  formatMissingTranslationKeyFilterScopeMessage,
} from "../src/features/localization/missing-translation-key-filter-scope.ts";

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

test("missing translation key filter restore message explains hidden selected keys", () => {
  assert.equal(
    formatMissingTranslationKeyFilterRestoreMessage({
      missingKeys: ["section.faq.answer"],
      namespace: "section.faq",
      query: "answer",
      resolvedKeys: [],
      selectedKey: "page.home.hero.title",
    }),
    "Selected missing key page.home.hero.title is outside the current filtered queue. Clear filters to restore the wider queue before continuing repairs.",
  );
});

test("missing translation key filter restore message ignores visible or resolved selections", () => {
  assert.equal(
    formatMissingTranslationKeyFilterRestoreMessage({
      missingKeys: ["page.home.hero.title"],
      namespace: "page.home",
      selectedKey: "page.home.hero.title",
    }),
    null,
  );
  assert.equal(
    formatMissingTranslationKeyFilterRestoreMessage({
      missingKeys: [],
      query: "page.home.hero.title",
      resolvedKeys: ["page.home.hero.title"],
      selectedKey: "page.home.hero.title",
    }),
    null,
  );
});
