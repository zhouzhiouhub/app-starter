import assert from "node:assert/strict";
import test from "node:test";
import {
  missingTranslationKeyPageStorageKey,
  readMissingTranslationKeyPageForKey,
  readMissingTranslationKeyPaginationState,
  readStoredMissingTranslationKeyPage,
  writeStoredMissingTranslationKeyPage,
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

test("missing translation key pagination remembers valid stored pages", () => {
  const values = new Map([[missingTranslationKeyPageStorageKey, "3"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(readStoredMissingTranslationKeyPage(storage), 3);
  writeStoredMissingTranslationKeyPage(storage, 2.9);
  assert.equal(values.get(missingTranslationKeyPageStorageKey), "2");
});

test("missing translation key pagination ignores invalid or blocked storage", () => {
  assert.equal(
    readStoredMissingTranslationKeyPage({
      getItem: () => "0",
      setItem: () => {},
    }),
    null,
  );
  assert.equal(
    readStoredMissingTranslationKeyPage({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    }),
    null,
  );

  assert.doesNotThrow(() =>
    writeStoredMissingTranslationKeyPage(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error("blocked");
        },
      },
      2,
    ),
  );
});
