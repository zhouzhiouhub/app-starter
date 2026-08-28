import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaReferenceSetKey,
  readMediaReferenceResolutionIssues,
  readMissingMediaReferences,
} from "../src/features/media/media-reference-resolution.ts";

test("media reference resolution reports missing references once", () => {
  assert.deepEqual(
    readMissingMediaReferences(
      [
        "media://hero",
        "media://hero",
        "media://gallery-a",
        "media://gallery-b",
      ],
      {
        "media://hero": "https://cdn.example.com/hero.jpg",
        "media://gallery-b": "https://cdn.example.com/gallery-b.jpg",
      },
    ),
    ["media://gallery-a"],
  );
});

test("media reference resolution keys are stable for repeated or reordered refs", () => {
  assert.equal(
    createMediaReferenceSetKey([
      "media://gallery-b",
      "media://hero",
      "media://hero",
      "media://gallery-a",
    ]),
    "media://gallery-a\nmedia://gallery-b\nmedia://hero",
  );
});

test("media reference resolution flags unsupported asset types", () => {
  assert.deepEqual(
    readMediaReferenceResolutionIssues(
      [
        "media://hero",
        "media://manual",
        "media://manual",
        "media://promo-video",
        "media://missing",
      ],
      {
        mediaTypesByReference: {
          "media://hero": "image",
          "media://manual": "pdf",
          "media://promo-video": "video",
        },
        urlsByReference: {
          "media://hero": "https://cdn.example.com/hero.jpg",
        },
      },
    ),
    [
      {
        assetType: "pdf",
        reason: "unsupported_type",
        reference: "media://manual",
      },
      {
        assetType: "video",
        reason: "unsupported_type",
        reference: "media://promo-video",
      },
      {
        reason: "missing",
        reference: "media://missing",
      },
    ],
  );
});
