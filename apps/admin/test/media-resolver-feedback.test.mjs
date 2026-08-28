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
      affectedReferenceCount: 1,
      description:
        "Publishing is blocked until referenced media has been verified for preview rendering.",
      message: "Resolving 1 media reference...",
      type: "info",
    },
  );
});

test("media resolver feedback ignores load failures without page references", () => {
  assert.equal(
    readMediaResolverFeedback({
      error: "Media assets could not be loaded.",
      isLoading: false,
      references: [],
      urlsByReference: {},
    }),
    null,
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
      affectedReferenceCount: 1,
      description:
        "1 media reference could not be verified. Preview may show unresolved media:// references.",
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
  assert.equal(feedback?.message, "3 media references need review.");
  assert.equal(
    feedback?.description,
    "Missing references: media://gallery-a, media://gallery-b, media://gallery-c.",
  );
  assert.equal(feedback?.affectedReferenceCount, 3);
  assert.equal(feedback?.missingReferenceCount, 3);
  assert.equal(feedback?.unsupportedReferenceCount, 0);
});

test("media resolver feedback reports unsupported media asset types", () => {
  const feedback = readMediaResolverFeedback({
    isLoading: false,
    mediaTypesByReference: {
      "media://hero": "image",
      "media://manual": "pdf",
      "media://promo-video": "video",
    },
    references: [
      "media://hero",
      "media://manual",
      "media://missing",
      "media://promo-video",
    ],
    urlsByReference: {
      "media://hero": "https://cdn.example.com/hero.jpg",
    },
  });

  assert.equal(feedback?.type, "warning");
  assert.equal(feedback?.message, "3 media references need review.");
  assert.equal(
    feedback?.description,
    "Missing references: media://missing. Unsupported media types: media://manual (pdf), media://promo-video (video).",
  );
  assert.equal(feedback?.affectedReferenceCount, 3);
  assert.equal(feedback?.missingReferenceCount, 1);
  assert.equal(feedback?.unsupportedReferenceCount, 2);
});
