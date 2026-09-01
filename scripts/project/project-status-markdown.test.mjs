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
    assert.match(markdown, /## Completion Summary/);
    assert.match(markdown, /Local MVP scope: `implemented`/);
    assert.match(markdown, /Release evidence: `needs-evidence`/);
    assert.match(markdown, /Release decision: `not-ready`/);
    assert.match(
      markdown,
      /final completion still requires retained production smoke and Page Builder visual acceptance evidence/,
    );
    assert.match(markdown, /Production Smoke: blocked/);
    assert.match(markdown, /### Missing Production Smoke Evidence/);
    assert.match(
      markdown,
      /Smoke report JSON: `artifacts\/production-smoke\/smoke-report\.json`/,
    );
    assert.match(markdown, /### Production Smoke Workflow Inputs/);
    assert.match(
      markdown,
      /`report_path`: `artifacts\/production-smoke\/smoke-report\.json` \(required; safe JSON output path\)/,
    );
    assert.match(
      markdown,
      /`require_r2_upload`: `true` \(required; keep R2 upload and CDN gate enabled for release\)/,
    );
    assert.match(
      markdown,
      /`visual_artifact_name`: `page-builder-visual-fixture-<run_number>` \(optional; Page Builder Visual artifact name\)/,
    );
    assert.match(
      markdown,
      /`allow_blocked_release_notes`: `false` \(required; only true for failure review drafts\)/,
    );
    assert.match(
      markdown,
      /Release evidence artifact: `release-evidence-check-<run_number>`/,
    );
    assert.match(
      markdown,
      /- Production Smoke: Production smoke artifact missing/,
    );
    assert.match(
      markdown,
      / {4}- Run workflow: `GitHub Actions Production Smoke against the production environment`/,
    );
    assert.match(
      markdown,
      / {4}- Manual dispatch: `GitHub Actions > Production Smoke > Run workflow, then use the listed workflow_dispatch inputs\.`/,
    );
    assert.match(
      markdown,
      / {4}- Smoke request: `pnpm smoke:request`/,
    );
    assert.match(
      markdown,
      / {4}- Validate dispatch: `pnpm smoke:dispatch -- --require-complete --visual-artifact "page-builder-visual-fixture-<run_number>"/,
    );
    assert.match(
      markdown,
      / {4}- Dispatch template: `gh workflow run production-smoke\.yml --ref main -f visual_artifact_name="page-builder-visual-fixture-<run_number>"/,
    );
    assert.match(
      markdown,
      / {4}- Local verification inputs: `local_verification_run_url=<main CI run URL>, local_verification_artifact_name=local-verification-<run_number>`/,
    );
    assert.match(
      markdown,
      / {4}- Visual evidence inputs: `visual_artifact_name=page-builder-visual-fixture-<run_number>, visual_artifact_run_id=<Page Builder Visual workflow run id>`/,
    );
    assert.match(
      markdown,
      / {4}- Release note inputs: `release_tag=<tag>, rollback_target=<target>, storefront_url=<public HTTPS storefront URL>`/,
    );
    assert.match(
      markdown,
      / {4}- Keep artifacts: `production-smoke-report-<run_number>, release-preflight-<run_number>, release-evidence-check-<run_number>, project-status-<run_number>`/,
    );
    assert.match(
      markdown,
      / {4}- Rerun gate: `pnpm release:check -- --smoke-report <path>`/,
    );
    assert.match(markdown, /Page Builder Visual: needs-evidence/);
    assert.match(markdown, /- Page Builder Visual: Visual acceptance pending/);
    assert.match(
      markdown,
      / {4}- Reference source: `docs\/visual\/page-builder-references`/,
    );
    assert.match(
      markdown,
      / {4}- Design request: `pnpm visual:references:request`/,
    );
    assert.match(
      markdown,
      / {4}- Reference report: `pnpm visual:references:check`/,
    );
    assert.match(
      markdown,
      / {4}- Capture fixture: `pnpm visual:capture:fixture -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --report reports\/visual\/page-builder-fixture\/visual-capture-report\.json --write-manifest`/,
    );
    assert.match(
      markdown,
      / {4}- Accept passing: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete`/,
    );
    assert.match(
      markdown,
      /- Release Evidence: Generate evidence request/,
    );
    assert.match(
      markdown,
      / {4}- Evidence request: `pnpm release:evidence-request`/,
    );
    assert.match(
      markdown,
      / {4}- Final gate: `pnpm release:handoff -- --require-ready --smoke-report artifacts\/production-smoke\/smoke-report\.json --visual-artifact-dir reports\/visual\/page-builder-fixture`/,
    );
    assert.match(markdown, /## Release Evidence Artifacts/);
    assert.match(
      markdown,
      /Production Smoke Markdown: `artifacts\/production-smoke\/smoke-report\.md`/,
    );
    assert.match(
      markdown,
      /Production Smoke preflight JSON: `artifacts\/release\/preflight\.json`/,
    );
    assert.match(
      markdown,
      /Production Smoke preflight Markdown: `artifacts\/release\/preflight\.md`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual manifest: `reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual capture report JSON: `reports\/visual\/page-builder-fixture\/visual-capture-report\.json`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual reference import Markdown: `reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual acceptance JSON: `reports\/visual\/page-builder-fixture\/visual-acceptance-report\.json`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual acceptance Markdown: `reports\/visual\/page-builder-fixture\/visual-acceptance-report\.md`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual artifact check JSON: `reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.json`/,
    );
    assert.match(
      markdown,
      /Page Builder Visual artifact check Markdown: `reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md`/,
    );
    assert.match(
      markdown,
      /Refresh visual references: `pnpm visual:references:check`/,
    );
    assert.match(
      markdown,
      /Refresh visual capture: `pnpm visual:capture:fixture -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --report reports\/visual\/page-builder-fixture\/visual-capture-report\.json --write-manifest`/,
    );
    assert.match(
      markdown,
      /Refresh visual measurements: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete`/,
    );
    assert.match(
      markdown,
      /Accept passing visual evidence: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete`/,
    );
    assert.match(
      markdown,
      /Refresh visual acceptance report: `pnpm visual:acceptance -- --checklist --output reports\/visual\/page-builder-fixture\/visual-acceptance-report\.json --markdown-output reports\/visual\/page-builder-fixture\/visual-acceptance-report\.md reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
    );
    assert.match(
      markdown,
      /Refresh visual artifact check: `pnpm visual:artifact-check -- --artifact-dir reports\/visual\/page-builder-fixture --output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.json --markdown-output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md`/,
    );
    assert.match(
      markdown,
      /Refresh Production Smoke preflight: `pnpm release:preflight -- --json-output artifacts\/release\/preflight\.json --markdown-output artifacts\/release\/preflight\.md`/,
    );
    assert.match(
      markdown,
      /Refresh release handoff: `pnpm release:handoff -- --smoke-report artifacts\/production-smoke\/smoke-report\.json --visual-artifact-dir reports\/visual\/page-builder-fixture`/,
    );
    assert.match(markdown, /## Local Verification/);
    assert.match(markdown, /Shortcut: `pnpm run verify:local`/);
    assert.match(markdown, /Handoff JSON: `tmp\/project-status\.json`/);
    assert.match(
      markdown,
      /Handoff Markdown: `tmp\/project-status-handoff\.md`/,
    );
    assert.match(markdown, /spec-table\.mobile/);
    assert.match(markdown, / {2}Steps:/);
    assert.match(
      markdown,
      / {4}- Reference: `docs\/visual\/page-builder-references\/spec-table-mobile\.png`/,
    );
    assert.match(
      markdown,
      / {4}- Preview: `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-spec-table-mobile\.png \(390x1000\)`/,
    );
    assert.match(
      markdown,
      / {4}- Accept passing: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete`/,
    );
    assert.match(
      markdown,
      / {4}- Verify: `pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
    );
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Project status Markdown written: ${escapeRegExp(outputPath)}`,
      ),
    );
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
    await rm(outputRoot, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
