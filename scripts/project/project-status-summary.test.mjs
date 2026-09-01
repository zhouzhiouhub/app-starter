import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runProjectStatusCli } from "../project-status.mjs";
import {
  createPendingVisualManifest,
  createVisualArtifactCheck,
} from "../release/release-check-test-fixtures.mjs";
import {
  createProjectStatusArtifact,
  formatProjectStatusSummary,
  readProjectStatusCliConfig,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status config keeps summary local", () => {
  const config = readProjectStatusCliConfig([
    "--",
    "--summary",
    "--json",
  ]);

  assert.equal(config.summary, true);
  assert.equal(config.json, true);
  assert.deepEqual(config.releaseCheckConfig._unknownArgs ?? [], []);
});

test("project status summary stays compact and actionable", () => {
  const artifact = createProjectStatusArtifact(
    {
      ...createBlockedCheck(),
      visualArtifact: createVisualArtifactCheck({ status: "incomplete" }),
    },
    {
      generatedAt: "2026-08-28T00:00:00.000Z",
    },
  );
  const text = formatProjectStatusSummary(artifact).join("\n");

  assert.match(text, /Project status summary \(project-status\.v1\)/);
  assert.match(text, /Phase: MVP release verification/);
  assert.match(text, /Status: needs-evidence/);
  assert.match(text, /Release ready: no/);
  assert.match(text, /Local MVP scope: implemented/);
  assert.match(text, /Release evidence: needs-evidence/);
  assert.match(text, /Release decision: not-ready/);
  assert.match(text, /Production Smoke: blocked \(missing\)/);
  assert.match(text, /Page Builder Visual: needs-evidence/);
  assert.match(text, /artifact incomplete/);
  assert.match(
    text,
    /references invalid \(12 missing, 0 updates, 0\/12 required source references available, first missing docs\/visual\/page-builder-references\/hero-banner-desktop\.png\)/,
  );
  assert.match(text, /Blockers: 2/);
  assert.match(text, /Production Smoke: Production smoke artifact missing/);
  assert.match(
    text,
    /Smoke request: pnpm smoke:request/,
  );
  assert.match(
    text,
    /Smoke request output: artifacts\/production-smoke\/production-smoke-request\.md/,
  );
  assert.match(
    text,
    /Dispatch inputs output: artifacts\/production-smoke\/production-smoke-dispatch-inputs\.txt/,
  );
  assert.match(
    text,
    /Dispatch inputs table output: artifacts\/production-smoke\/production-smoke-dispatch-inputs\.tsv/,
  );
  assert.match(
    text,
    /Dispatch inputs JSON output: artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json/,
  );
  assert.doesNotMatch(text, /Validate dispatch: pnpm smoke:dispatch -- --require-complete/);
  assert.doesNotMatch(text, /Manual dispatch: GitHub Actions > Production Smoke/);
  assert.match(text, /Page Builder Visual: Visual acceptance pending/);
  assert.match(
    text,
    /Design request: pnpm visual:references:request/,
  );
  assert.match(
    text,
    /Design request output: artifacts\/visual\/page-builder-reference-request\.md/,
  );
  assert.match(text, /Release Evidence: Refresh evidence requests/);
  assert.match(text, /Refresh requests: pnpm release:requests/);
  assert.match(
    text,
    /Refresh requests output: artifacts\/release\/release-evidence-request\.md, artifacts\/release\/release-requests-manifest\.json/,
  );
  assert.match(
    text,
    /Release requests manifest output: artifacts\/release\/release-requests-manifest\.json/,
  );
  assert.doesNotMatch(text, /Evidence request: pnpm release:evidence-request/);
  assert.doesNotMatch(text, /Reference report: pnpm visual:references:check/);
  assert.doesNotMatch(text, /Missing paths: pnpm --silent visual:references:missing/);
  assert.doesNotMatch(text, /Reference source: docs\/visual\/page-builder-references/);
  assert.match(text, /Details: pnpm project:status -- --all-actions/);
  assert.doesNotMatch(text, /Completion checklist:/);
  assert.doesNotMatch(text, /Completed milestones:/);
  assert.doesNotMatch(text, /Local verification:/);
});

test("project status CLI can print a compact summary", async () => {
  const emptyArchiveRoot = mkdtempSync(
    path.join(tmpdir(), "project-status-summary-"),
  );
  const stdout = [];

  try {
    const exitCode = await runProjectStatusCli(["--summary"], {
      smokeRoots: [emptyArchiveRoot],
      stdout: (line) => stdout.push(line),
      visualManifest: createPendingVisualManifest(),
    });
    const text = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(text, /Project status summary \(project-status\.v1\)/);
    assert.match(text, /Release ready: no/);
    assert.match(text, /Production Smoke: blocked \(missing\)/);
    assert.match(
      text,
      /Page Builder Visual: needs-evidence, 0\/12 viewports accepted, 12 tasks pending/,
    );
    assert.match(text, /Next:/);
    assert.match(
      text,
      /Smoke request: pnpm smoke:request/,
    );
    assert.match(
      text,
      /Smoke request output: artifacts\/production-smoke\/production-smoke-request\.md/,
    );
  assert.match(
    text,
    /Dispatch inputs output: artifacts\/production-smoke\/production-smoke-dispatch-inputs\.txt/,
  );
  assert.match(
    text,
    /Dispatch inputs table output: artifacts\/production-smoke\/production-smoke-dispatch-inputs\.tsv/,
  );
  assert.match(
    text,
    /Dispatch inputs JSON output: artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json/,
  );
    assert.match(text, /Page Builder Visual: Visual acceptance pending/);
    assert.match(
      text,
      /Design request: pnpm visual:references:request/,
    );
    assert.match(
      text,
      /Design request output: artifacts\/visual\/page-builder-reference-request\.md/,
    );
    assert.match(text, /Release Evidence: Refresh evidence requests/);
    assert.match(text, /Refresh requests: pnpm release:requests/);
    assert.match(
      text,
      /Refresh requests output: artifacts\/release\/release-evidence-request\.md, artifacts\/release\/release-requests-manifest\.json/,
    );
    assert.match(
      text,
      /Release requests manifest output: artifacts\/release\/release-requests-manifest\.json/,
    );
    assert.doesNotMatch(text, /Evidence request: pnpm release:evidence-request/);
    assert.match(text, /\.\.\. and 12 more next actions/);
    assert.doesNotMatch(text, /Completion checklist:/);
    assert.doesNotMatch(text, /Completed milestones:/);
    assert.doesNotMatch(text, /Local verification:/);
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
  }
});

test("README current status reflects blocked release evidence", async () => {
  const readme = await readFile("README.md", "utf8");

  assert.match(readme, /状态更新时间：2026-09-01/);
  assert.match(readme, /发布门禁状态（2026-09-01）/);
  assert.match(readme, /Release ready: no/);
  assert.match(readme, /发布结论：`not-ready`/);
  assert.match(readme, /Production Smoke artifact 缺失/);
  assert.match(readme, /当前 `0\/12` viewport accepted/);
  assert.match(
    readme,
    /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
  );
  assert.match(readme, /pnpm project:status -- --all-actions/);
  assert.doesNotMatch(
    readme,
    /下一步是在真实生产 R2 \/ CDN 环境执行验收并归档报告/,
  );
});
