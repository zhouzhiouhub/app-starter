import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTranslationListSearch,
  readTranslationListFilters,
} from "../src/features/localization/translation-list-query.ts";

test("translation list query reads persisted filters", () => {
  assert.deepEqual(
    readTranslationListFilters(
      new URLSearchParams("namespace=page.home&q=hero&page=3&limit=40"),
    ),
    {
      limit: 40,
      namespace: "page.home",
      page: 3,
      query: "hero",
    },
  );
});

test("translation list query ignores unsafe or out of range values", () => {
  assert.deepEqual(
    readTranslationListFilters(
      new URLSearchParams(
        `namespace=Page.Home&q=${"x".repeat(129)}&page=0&limit=999`,
      ),
    ),
    {
      limit: 100,
      namespace: undefined,
      page: 1,
      query: undefined,
    },
  );
});

test("translation list search preserves useful filters and omits defaults", () => {
  assert.equal(
    buildTranslationListSearch({
      limit: 20,
      namespace: " page.home ",
      page: 1,
      query: " hero ",
    }),
    "namespace=page.home&q=hero",
  );
  assert.equal(
    buildTranslationListSearch({
      limit: 40,
      namespace: "page.home",
      page: 2,
      query: "title",
    }),
    "namespace=page.home&q=title&page=2&limit=40",
  );
});
