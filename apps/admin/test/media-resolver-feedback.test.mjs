import assert from "node:assert/strict";
import test from "node:test";
import { readMediaResolverFeedback } from "../src/features/media/media-resolver-feedback.ts";

test("media resolver feedback reports loading only when references exist", () => {
  assert.equal(
    readMediaResolverFeedback({
      isLoading: true,
      references: [],
      urlsByReference: {},
    }),
    null,
  );

  assert.deepEqual(
    readMediaResolverFeedback({
      isLoading: true,
      references: ["media://hero"],
      urlsByReference: {},
    }),
    {
      message: "Resolving media references...",
      type: "info",
    },
  );
});

test("media resolver feedback reports load failures", () => {
  assert.deepEqual(
    readMediaResolverFeedback({
      error: "Media assets could not be loaded.",
      isLoading: false,
      references: ["media://hero"],
      urlsByReference: {},
    }),
    {
      description: "Preview may show unresolved media:// references.",
      message: "Media assets could not be loaded.",
      type: "error",
    },
  );
});

test("media resolver feedback reports missing references once loaded", () => {
  const feedback = readMediaResolverFeedback({
    isLoading: false,
    references: [
      "media://hero",
      "media://hero",
      "media://gallery-a",
      "media://gallery-b",
      "media://gallery-c",
    ],
    urlsByReference: {
      "media://hero": "https://cdn.example.com/hero.jpg",
    },
  });

  assert.equal(feedback?.type, "warning");
  assert.equal(feedback?.message, "Some media references are unavailable.");
  assert.equal(
    feedback?.description,
    "Missing references: media://gallery-a, media://gallery-b, media://gallery-c",
  );
});
