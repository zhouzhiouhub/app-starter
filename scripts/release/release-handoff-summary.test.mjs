import assert from "node:assert/strict";
import test from "node:test";
import { formatReleaseHandoffSummary } from "./release-handoff.mjs";

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
  assert.match(text, /Visual artifact: complete \(6\/6 files, 12\/12 screenshots\)/);
});
