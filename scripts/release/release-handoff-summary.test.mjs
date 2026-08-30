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
    /Visual artifact: complete \(reports\/visual\/page-builder-fixture, 6\/6 files, 12\/12 screenshots\)/,
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
    assert.match(
      text,
      /terminal\s+summary prints Production Smoke,\s+Page Builder\s+Visual,\s+and optional visual\s+artifact status,\s+path,\s+and counts/s,
    );
    assert.match(
      text,
      /prints the first two\s+next actions with\s+structured steps/s,
    );
  }

  assert.match(
    readme,
    /终端摘要会先打印 Production Smoke、Page Builder Visual 和 Visual artifact 状态、路径和计数，然后打印 first two next actions/s,
  );
});
