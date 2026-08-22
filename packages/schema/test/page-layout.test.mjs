import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrderedSectionsForViewport,
  pageSchema,
  setSectionOrderForViewport,
} from "../dist/index.js";
import { minimalPage, section } from "./page-schema-test-helpers.mjs";

test("page schema orders sections per viewport with legacy fallback", () => {
  const page = pageSchema.parse(
    minimalPage({
      layout: {
        desktop: {
          sectionOrder: ["copy", "hero", "missing", "copy"],
        },
        mobile: {},
      },
      sections: [
        section("hero", "hero-banner"),
        section("copy", "rich-text"),
        section("cta", "cta-bar"),
      ],
    }),
  );

  assert.deepEqual(
    getOrderedSectionsForViewport(page, "desktop").map((node) => node.id),
    ["copy", "hero", "cta"],
  );
  assert.deepEqual(
    getOrderedSectionsForViewport(page, "mobile").map((node) => node.id),
    ["hero", "copy", "cta"],
  );

  const reordered = setSectionOrderForViewport(page, "mobile", ["cta", "hero"]);

  assert.deepEqual(reordered.layout.mobile.sectionOrder, [
    "cta",
    "hero",
    "copy",
  ]);
});
