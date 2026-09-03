import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release check docs mention visual artifact text summary counts", async () => {
  const [readme, setupDoc, releaseChecklist] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(
    readme,
    /visual\.failedMeasurementCount.*visual\.failedMeasurementViewportCount.*visual\.firstFailedMeasurement/s,
  );
  assert.match(
    setupDoc,
    /text summary, Markdown, and JSON artifact include failed\s+visual measurement viewport\/metric counts and the first failed measurement/s,
  );
  assert.match(
    setupDoc,
    /readinessChecklist` with the same\s+release tasks, visual artifact path, issue, reference-import, missing reference\s+path, first missing preview, required source reference availability, measurement, and count details/s,
  );
  assert.match(
    releaseChecklist,
    /prints the visual artifact path plus issue, file, and\s+screenshot counts plus reference-import status, required source reference\s+availability, failed visual measurement counts and the first failed\s+measurement when metrics are below target/s,
  );
  assert.match(
    releaseChecklist,
    /readinessChecklist` lists the\s+Production Smoke, Page Builder visual, and release notes tasks, including the\s+visual artifact path, issue count, reference-import summary,\s+required source reference availability, failed measurement summary, missing\s+reference path list, first missing preview, and counts/s,
  );
});
