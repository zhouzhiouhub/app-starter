import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createProjectStatusArtifact,
  createProjectStatusMarkdown,
  formatProjectStatusArtifact,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status summarizes visual artifact counts", () => {
  const check = createBlockedCheck();
  check.visualArtifact = {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    requiredFileCount: 6,
    status: "complete",
  };
  const artifact = createProjectStatusArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });
  const terminalText = formatProjectStatusArtifact(artifact).join("\n");
  const markdown = createProjectStatusMarkdown(artifact);

  assert.deepEqual(artifact.releaseGate.visual.artifactCheck, {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    requiredFileCount: 6,
    status: "complete",
  });
  assert.match(
    terminalText,
    /Page Builder Visual: needs-evidence, components 0\/6, viewports 0\/12, pending tasks 12, artifact complete \(reports\/visual\/page-builder-fixture, 6\/6 files, 12\/12 screenshots\)/,
  );
  assert.match(
    markdown,
    /Page Builder Visual: needs-evidence, 0\/6 components, 0\/12 viewports, 12 pending tasks, artifact complete \(reports\/visual\/page-builder-fixture, 6\/6 files, 12\/12 screenshots\)/,
  );
});

test("project status docs mention visual artifact path and counts", async () => {
  const [readme, setupDoc, releaseChecklist] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(readme, /artifact complete` 及 artifact 路径、文件\/截图计数/);
  assert.match(readme, /releaseGate\.visual\.artifactCheck/);
  assert.match(setupDoc, /prints its artifact path, file, and\s+screenshot counts/s);
  assert.match(setupDoc, /releaseGate\.visual\.artifactCheck/);
  assert.match(releaseChecklist, /artifact path,\s+file, and screenshot counts/s);
});
