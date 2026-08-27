import assert from "node:assert/strict";
import test from "node:test";
import { formatTranslationImportFilterDifferenceMessage } from "../src/features/localization/translation-import-filter-difference.ts";

test("translation import filter difference explains draft rows outside filters", () => {
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: JSON.stringify({
        entries: [
          {
            context: "page.home.hero / title",
            key: "page.home.hero.title",
            value: "Title",
          },
          {
            context: "section.faq / answer",
            key: "section.faq.answer",
            value: "Answer",
          },
        ],
      }),
      namespace: "page.home",
      query: "hero",
    }),
    "1 draft row is outside current translation filters (namespace=page.home, q=hero). Import still writes default Locale rows, but the table may hide them until filters are cleared.",
  );
});

test("translation import filter difference matches query against value and context", () => {
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: JSON.stringify({
        entries: [
          {
            context: "page.home.hero / title",
            key: "page.home.hero.title",
            value: "Title",
          },
        ],
      }),
      namespace: "page.home",
      query: "Title",
    }),
    null,
  );
});

test("translation import filter difference ignores missing filters and invalid JSON", () => {
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: JSON.stringify({
        entries: [{ key: "section.faq.answer", value: "Answer" }],
      }),
    }),
    null,
  );
  assert.equal(
    formatTranslationImportFilterDifferenceMessage({
      importText: "{",
      namespace: "page.home",
    }),
    null,
  );
});
