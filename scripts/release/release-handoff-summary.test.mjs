import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  formatReleaseHandoffSummary,
  printReleaseHandoffHelp,
} from "./release-handoff.mjs";

test("release handoff summary exposes release evidence statuses", () => {
  const lines = formatReleaseHandoffSummary({
    config: {
      preflightOutputPath: "artifacts/release/preflight.json",
      preflightMarkdownPath: "artifacts/release/preflight.md",
      releaseCheckOutputPath: "artifacts/release/release-check.json",
      releaseCheckMarkdownPath: "artifacts/release/release-check.md",
      projectStatusOutputPath: "artifacts/release/project-status.json",
      projectStatusMarkdownPath: "artifacts/release/project-status.md",
    },
    preflightReport: { status: "passed" },
    projectArtifact: {
      nextActions: [],
      status: "needs-evidence",
    },
    releaseArtifact: {
      blockerCount: 8,
      releaseReady: false,
      smoke: { status: "blocked" },
      visual: {
        artifactCheck: {
          artifactDir: "reports/visual/page-builder-fixture",
          expectedScreenshotCount: 12,
          presentRequiredFileCount: 6,
          presentScreenshotCount: 12,
          requiredFileCount: 6,
          referenceImport: {
            missingCount: 12,
            missingReferences: [
              "docs/visual/page-builder-references/hero-banner-desktop.png",
            ],
            requiredReferenceCount: 12,
            requiredReferenceEntryCount: 12,
            requiredReferenceStatusCounts: {
              invalid: 0,
              missing: 12,
              ready: 0,
              updated: 0,
              wouldUpdate: 0,
            },
            status: "invalid",
            updateCount: 0,
          },
          status: "complete",
        },
        status: "needs-evidence",
      },
    },
  });
  const text = lines.join("\n");

  assert.match(text, /Production Smoke: blocked/);
  assert.match(text, /Page Builder Visual: needs-evidence/);
  assert.match(
    text,
    /Visual artifact: complete \(reports\/visual\/page-builder-fixture, 6\/6 files, 12\/12 screenshots, references invalid \(12 missing, 0 updates, 0\/12 required source references available, first missing docs\/visual\/page-builder-references\/hero-banner-desktop\.png\)\)/,
  );
});

test("release handoff docs describe terminal evidence statuses", async () => {
  const helpOutput = [];
  printReleaseHandoffHelp((line) => helpOutput.push(line));
  const [readme, setupDoc, releaseChecklist] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  for (const text of [helpOutput.join("\n"), setupDoc, releaseChecklist]) {
    const normalized = normalizeWhitespace(text);

    assert.match(
      normalized,
      /terminal summary prints Production Smoke, Page Builder Visual, and optional visual artifact status, path, and counts/,
    );
    assert.match(
      normalized,
      /prints the first two next actions with structured steps/,
    );
    assert.match(
      normalized,
      /reference-import status, missing\/update counts, required source reference availability, and the first missing reference path/,
    );
  }

  assert.match(
    readme,
    /终端摘要会先打印 Production Smoke、Page Builder Visual 和 Visual artifact 状态、路径和计数；当 visual artifact 带 reference import 结果时，.*然后打印 first two next actions/s,
  );
});

function normalizeWhitespace(value) {
  return value.replace(/\s+/gu, " ");
}
