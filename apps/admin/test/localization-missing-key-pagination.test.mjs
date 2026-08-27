import assert from "node:assert/strict";
import test from "node:test";
import {
  readMissingTranslationKeyPageForKey,
  readMissingTranslationKeyPaginationState,
} from "../src/features/localization/missing-translation-key-pagination.ts";

const keys = Array.from(
  { length: 23 },
  (_, index) => `page.home.key${index + 1}`,
);

test("missing translation key pagination clamps pages and slices keys", () => {
  assert.deepEqual(
    readMissingTranslationKeyPaginationState({
      currentPage: 3,
      keys,
      pageSize: 10,
    }),
    {
      currentPage: 3,
      endIndex: 23,
      keys: ["page.home.key21", "page.home.key22", "page.home.key23"],
      pageSize: 10,
      startIndex: 21,
      totalCount: 23,
      totalPages: 3,
    },
  );
  assert.equal(
    readMissingTranslationKeyPaginationState({
      currentPage: 99,
      keys,
      pageSize: 10,
    }).currentPage,
    3,
  );
});

test("missing translation key pagination locates selected keys", () => {
  assert.equal(
    readMissingTranslationKeyPageForKey({
      key: "page.home.key11",
      keys,
      pageSize: 10,
    }),
    2,
  );
  assert.equal(
    readMissingTranslationKeyPageForKey({
      key: "page.missing.key",
      keys,
      pageSize: 10,
    }),
    null,
  );
});

test("missing translation key pagination handles empty lists", () => {
  assert.deepEqual(
    readMissingTranslationKeyPaginationState({
      currentPage: 2,
      keys: [],
      pageSize: 10,
    }),
    {
      currentPage: 1,
      endIndex: 0,
      keys: [],
      pageSize: 10,
      startIndex: 0,
      totalCount: 0,
      totalPages: 1,
    },
  );
});
