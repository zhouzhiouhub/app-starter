import assert from "node:assert/strict";
import test from "node:test";
import { formatDefaultTranslationSaveMessage } from "../src/features/localization/translation-save-feedback.ts";

test("default translation save feedback explains created entries", () => {
  assert.equal(
    formatDefaultTranslationSaveMessage({
      locale: "en-US",
      result: {
        entry: {
          key: "page.home.hero.title",
          locale: "en-US",
          value: "Build better storefronts",
        },
        writeMode: "created",
      },
    }),
    "Saved new page.home.hero.title for en-US.",
  );
});

test("default translation save feedback can mention table focus", () => {
  assert.equal(
    formatDefaultTranslationSaveMessage({
      locale: "en-US",
      result: {
        entry: {
          key: "page.home.hero.title",
          locale: "en-US",
          value: "Build better storefronts",
        },
        writeMode: "updated",
      },
      willLocateEntry: true,
    }),
    "Updated existing page.home.hero.title for en-US. The translations table is focused on this key.",
  );
});
