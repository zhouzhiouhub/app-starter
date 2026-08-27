import assert from "node:assert/strict";
import test from "node:test";
import { groupMissingTranslationKeys } from "../src/features/localization/missing-translation-key-groups.ts";

test("missing translation keys are grouped by leading namespace", () => {
  assert.deepEqual(
    groupMissingTranslationKeys([
      "page.home.hero.title",
      "page.home.hero.body",
      "section.faq.question",
      "page.legal.privacy.title",
    ]),
    [
      {
        keys: ["page.home.hero.title", "page.home.hero.body"],
        namespace: "page.home",
      },
      {
        keys: ["section.faq.question"],
        namespace: "section.faq",
      },
      {
        keys: ["page.legal.privacy.title"],
        namespace: "page.legal",
      },
    ],
  );
});

test("missing translation key groups skip blank entries", () => {
  assert.deepEqual(
    groupMissingTranslationKeys([" page.home.title ", "page.home.title", " "]),
    [
      {
        keys: ["page.home.title"],
        namespace: "page.home",
      },
    ],
  );
});
