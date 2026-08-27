import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeResolvedTranslationKeys,
  readMissingTranslationKeyAdvanceTarget,
  readMissingTranslationKeyQueueState,
} from "../src/features/localization/missing-translation-key-queue.ts";

test("missing translation key queue starts at the first valid key", () => {
  assert.deepEqual(
    readMissingTranslationKeyQueueState([
      "Page.Home.Title",
      "page.home.hero.title",
      " page.home.hero.title ",
      "section.faq.answer",
    ]),
    {
      currentIndex: 0,
      currentKey: "page.home.hero.title",
      keys: ["page.home.hero.title", "section.faq.answer"],
      nextKey: "section.faq.answer",
      previousKey: null,
      totalCount: 2,
    },
  );
});

test("missing translation key queue reads previous and next keys", () => {
  assert.deepEqual(
    readMissingTranslationKeyQueueState(
      ["page.home.hero.title", "page.home.hero.body", "section.faq.answer"],
      "page.home.hero.body",
    ),
    {
      currentIndex: 1,
      currentKey: "page.home.hero.body",
      keys: [
        "page.home.hero.title",
        "page.home.hero.body",
        "section.faq.answer",
      ],
      nextKey: "section.faq.answer",
      previousKey: "page.home.hero.title",
      totalCount: 3,
    },
  );
});

test("missing translation key queue skips recently resolved keys", () => {
  assert.deepEqual(
    readMissingTranslationKeyQueueState(
      ["page.home.hero.title", "page.home.hero.body", "section.faq.answer"],
      "page.home.hero.title",
      ["page.home.hero.title"],
    ),
    {
      currentIndex: 0,
      currentKey: "page.home.hero.body",
      keys: ["page.home.hero.body", "section.faq.answer"],
      nextKey: "section.faq.answer",
      previousKey: null,
      totalCount: 2,
    },
  );
});

test("resolved translation keys merge safely", () => {
  assert.deepEqual(
    mergeResolvedTranslationKeys(
      ["page.home.hero.title"],
      [" page.home.hero.title ", "section.faq.answer", "Bad.Key"],
    ),
    ["page.home.hero.title", "section.faq.answer"],
  );
});

test("missing translation key queue reports visible completion", () => {
  assert.deepEqual(
    readMissingTranslationKeyQueueState(
      ["page.home.hero.title"],
      "page.home.hero.title",
      ["page.home.hero.title"],
    ),
    {
      currentIndex: -1,
      currentKey: null,
      keys: [],
      nextKey: null,
      previousKey: null,
      totalCount: 0,
    },
  );
});

test("missing translation key queue advances after the resolved key", () => {
  assert.equal(
    readMissingTranslationKeyAdvanceTarget({
      keys: [
        "page.home.hero.title",
        "page.home.hero.body",
        "section.faq.answer",
      ],
      resolvedKey: "page.home.hero.body",
      selectedKey: "page.home.hero.body",
    }),
    "section.faq.answer",
  );
});

test("missing translation key queue wraps to remaining keys when the last selected key is saved", () => {
  assert.equal(
    readMissingTranslationKeyAdvanceTarget({
      keys: ["page.home.hero.title", "page.home.hero.body"],
      resolvedKey: "page.home.hero.body",
      selectedKey: "page.home.hero.body",
    }),
    "page.home.hero.title",
  );
});

test("missing translation key queue does not advance unrelated saves", () => {
  assert.equal(
    readMissingTranslationKeyAdvanceTarget({
      keys: ["page.home.hero.title"],
      resolvedKey: "settings.footer.note",
    }),
    null,
  );
});
