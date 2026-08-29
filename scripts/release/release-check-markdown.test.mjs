import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { runReleaseCheckCli } from "../release-check.mjs";
import {
  createReleaseEvidenceCheck,
  createReleaseEvidenceCheckArtifact,
  createReleaseEvidenceCheckMarkdown,
} from "./release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createPendingVisualManifest,
  createVisualArtifactCheck,
} from "./release-check-test-fixtures.mjs";

test("release check Markdown summarizes ready evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const artifact = createReleaseEvidenceCheckArtifact(
    createReleaseEvidenceCheck({
      smokeArtifact: {
        path: "artifacts/production-smoke/smoke-report.json",
        report: createCompleteReleaseReport(),
      },
      visualArtifact: createVisualArtifactCheck({ status: "complete" }),
      visualArtifactDir: "reports/visual/page-builder-fixture",
      visualEvidenceRoot: evidenceRoot,
      visualManifest: manifest,
      visualManifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    }),
    { generatedAt: "2026-08-29T00:00:00.000Z" },
  );
  const markdown = createReleaseEvidenceCheckMarkdown(artifact);

  assert.match(markdown, /^# Release Evidence Check/m);
  assert.match(markdown, /Generated: `2026-08-29T00:00:00.000Z`/);
  assert.match(markdown, /Status: `ready`/);
  assert.match(markdown, /Release ready: yes/);
  assert.match(markdown, /Report path: `artifacts\/production-smoke\/smoke-report\.json`/);
  assert.match(markdown, /Source workflow URL: https:\/\/github\.com\/zhouzhiouhub\/app-starter\/actions\/runs\/123456789/);
  assert.match(markdown, /Manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/);
  assert.match(markdown, /Artifact check: complete/);
  assert.match(markdown, /## Readiness Checklist/);
  assert.match(markdown, /## Pending Visual Evidence/);
  assert.match(markdown, /- None/);
});

test("release check Markdown lists blockers and visual tasks", () => {
  const artifact = createReleaseEvidenceCheckArtifact(
    createReleaseEvidenceCheck({
      smokeArtifact: {
        path: "artifacts/production-smoke/smoke-report.json",
        report: createCompleteReleaseReport({
          requireAdminApp: false,
          requireR2Upload: false,
          requireRevalidation: false,
        }),
      },
      visualArtifact: createVisualArtifactCheck({ status: "invalid" }),
      visualArtifactDir: "reports/visual/page-builder-fixture",
      visualManifest: createPendingVisualManifest(),
      visualManifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    }),
    { generatedAt: "2026-08-29T00:00:00.000Z" },
  );
  const markdown = createReleaseEvidenceCheckMarkdown(artifact);

  assert.match(markdown, /Status: `blocked`/);
  assert.match(markdown, /Production Smoke: R2 upload smoke required/);
  assert.match(markdown, /Page Builder Visual: Visual artifact invalid/);
  assert.match(markdown, /Artifact issues:/);
  assert.match(markdown, /missing_artifact_file/);
  assert.match(markdown, /hero-banner\.desktop: missing designReference/);
  assert.match(
    markdown,
    /capture `pnpm visual:capture:fixture -- --component hero-banner --viewport desktop --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --write-manifest`/,
  );
  assert.match(
    markdown,
    /reference report `pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --markdown-output reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md --require-complete`/,
  );
  assert.match(
    markdown,
    /import `pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete`/,
  );
  assert.match(markdown, /pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/);
});

test("release check CLI writes Markdown output", async () => {
  const outputRoot = `tmp/release-check-markdown-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/release-check.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runReleaseCheckCli(
      ["--markdown-output", outputPath],
      {
        smokeArtifact: {
          path: "artifacts/production-smoke/smoke-report.json",
          report: createCompleteReleaseReport(),
        },
        stdout: (line) => stdout.push(line),
        visualManifest: createPendingVisualManifest(),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 1);
    assert.match(markdown, /^# Release Evidence Check/m);
    assert.match(markdown, /Release ready: no/);
    assert.match(markdown, /hero-banner\.desktop/);
    assert.match(
      stdout.join("\n"),
      new RegExp(`Release evidence Markdown written: ${escapeRegExp(outputPath)}`),
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
