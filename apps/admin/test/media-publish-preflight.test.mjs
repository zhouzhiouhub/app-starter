import assert from "node:assert/strict";
import test from "node:test";
import { pageMediaReferenceMaxCount } from "@app-starter/schema";
import {
  collectMediaPublishPreflightIssues,
  readMediaPublishPreflightIssue,
  readMediaReferenceLimitPreflightIssue,
} from "../src/features/pages/media-publish-preflight.ts";

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

test("media publish preflight blocks oversized reference sets", () => {
  const references = Array.from(
    { length: pageMediaReferenceMaxCount + 1 },
    (_value, index) => `media://asset-${index}`,
  );

  assert.deepEqual(readMediaReferenceLimitPreflightIssue(references), {
    field: "media.references",
    message: `Page references ${pageMediaReferenceMaxCount + 1} media assets, above the publish limit of ${pageMediaReferenceMaxCount}. Remove unused media references before publishing.`,
    severity: "error",
  });

  assert.equal(
    readMediaReferenceLimitPreflightIssue(references.slice(1)),
    null,
  );
});

test("media publish preflight combines resolver and reference limit issues", () => {
  const references = Array.from(
    { length: pageMediaReferenceMaxCount + 1 },
    (_value, index) => `media://asset-${index}`,
  );

  const issues = collectMediaPublishPreflightIssues({
    feedback: {
      message: "Resolving media references...",
      type: "info",
    },
    references,
  });

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [
      ["media.references", "error"],
      ["media.references", "error"],
    ],
  );
  assert.match(issues[0].message, /above the publish limit/);
  assert.match(issues[1].message, /still resolving/);
});
