import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaReferenceSetKey,
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
