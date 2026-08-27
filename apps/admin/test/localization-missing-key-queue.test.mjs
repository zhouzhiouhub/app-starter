import assert from "node:assert/strict";
import test from "node:test";
import { readMissingTranslationKeyQueueState } from "../src/features/localization/missing-translation-key-queue.ts";

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
      nextKey: "section.faq.answer",
      previousKey: "page.home.hero.title",
      totalCount: 3,
    },
  );
});
