import assert from "node:assert/strict";
import test from "node:test";
import {
  createTranslationKeyDraft,
  readTranslationKeyOptions,
} from "../src/features/localization/translation-key-draft.ts";

test("translation key drafts normalize valid missing keys", () => {
  assert.deepEqual(createTranslationKeyDraft(" page.home.hero.title "), {
    context: "page.home.hero / title",
    key: "page.home.hero.title",
  });
});

test("translation key drafts reject invalid key names", () => {
  assert.equal(createTranslationKeyDraft("Page.Home.Title"), null);
  assert.equal(createTranslationKeyDraft("home"), null);
  assert.equal(createTranslationKeyDraft(null), null);
});

test("translation key options keep unique valid keys", () => {
  assert.deepEqual(
    readTranslationKeyOptions([
      "page.home.hero.title",
      " page.home.hero.title ",
      "Page.Home.Hero.Body",
      "section.faq.answer",
    ]),
    [{ value: "page.home.hero.title" }, { value: "section.faq.answer" }],
  );
});
