import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runProjectStatusCli } from "../project-status.mjs";
import { createPendingVisualManifest } from "../release/release-check-test-fixtures.mjs";

test("project status CLI writes a Markdown handoff", async () => {
  const emptyArchiveRoot = mkdtempSync(
    path.join(tmpdir(), "project-status-markdown-smoke-"),
  );
  const outputRoot = `tmp/project-status-markdown-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/project-status.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runProjectStatusCli(
      ["--markdown-output", outputPath],
      {
        generatedAt: "2026-08-28T00:00:00.000Z",
        smokeRoots: [emptyArchiveRoot],
        stdout: (line) => stdout.push(line),
        visualManifest: createPendingVisualManifest(),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(markdown, /^# MVP Release Handoff/m);
    assert.match(markdown, /Generated: `2026-08-28T00:00:00.000Z`/);
    assert.match(markdown, /Release ready: no/);
    assert.match(markdown, /Production Smoke: blocked/);
    assert.match(markdown, /Page Builder Visual: needs-evidence/);
    assert.match(markdown, /## Release Evidence Artifacts/);
    assert.match(
      markdown,
      /Production Smoke Markdown: `artifacts\/production-smoke\/smoke-report\.md`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual acceptance Markdown: `reports\/visual\/page-builder-fixture\/visual-acceptance-report\.md`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual artifact check Markdown: `reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md`/,
    );
    assert.match(
      markdown,
      /Refresh combined gate: `pnpm release:check -- --smoke-report artifacts\/production-smoke\/smoke-report\.json --visual-artifact-dir reports\/visual\/page-builder-fixture --output artifacts\/release\/release-check\.json --markdown-output artifacts\/release\/release-check\.md`/,
    );
    assert.match(
      markdown,
      /Refresh status handoff: `pnpm project:status -- --all-actions --smoke-report artifacts\/production-smoke\/smoke-report\.json --visual-artifact-dir reports\/visual\/page-builder-fixture --output artifacts\/release\/project-status\.json --markdown-output artifacts\/release\/project-status\.md`/,
    );
    assert.match(markdown, /spec-table\.mobile/);
    assert.match(markdown, /pnpm visual:acceptance -- --require-accepted/);
    assert.match(
      stdout.join("\n"),
      new RegExp(`Project status Markdown written: ${escapeRegExp(outputPath)}`),
    );
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
    await rm(outputRoot, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
