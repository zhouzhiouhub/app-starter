import assert from "node:assert/strict";
import test from "node:test";
import { readMediaPublishPreflightIssue } from "../src/features/pages/media-publish-preflight.ts";

test("media publish preflight waits for reference resolution", () => {
  assert.deepEqual(
    readMediaPublishPreflightIssue({
      message: "Resolving media references...",
      type: "info",
    }),
    {
      field: "media.references",
      message:
        "Media references are still resolving. Wait for preview media to finish loading before publishing.",
      severity: "error",
    },
  );
});

test("media publish preflight blocks when references cannot be verified", () => {
  assert.deepEqual(
    readMediaPublishPreflightIssue({
      description: "Preview may show unresolved media:// references.",
      message: "Media assets could not be loaded.",
      type: "error",
    }),
    {
      field: "media.references",
      message:
        "Media references could not be verified. Media assets could not be loaded.",
      severity: "error",
    },
  );
});

test("media publish preflight blocks missing references", () => {
  assert.deepEqual(
    readMediaPublishPreflightIssue({
      description: "Missing references: media://hero",
      message: "Some media references are unavailable.",
      type: "warning",
    }),
    {
      field: "media.references",
      message:
        "Media references are unavailable. Missing references: media://hero",
      severity: "error",
    },
  );

  assert.equal(readMediaPublishPreflightIssue(null), null);
});
