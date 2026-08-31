import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
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
    /Run workflow: GitHub Actions Production Smoke against the production environment/,
  );
  assert.match(text, /Page Builder Visual: Visual acceptance pending/);
  assert.match(
    text,
    /Reference report: pnpm visual:references:check/,
  );
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
    assert.match(text, /Page Builder Visual: Visual acceptance pending/);
    assert.match(
      text,
      /Reference report: pnpm visual:references:check/,
    );
    assert.match(text, /\.\.\. and 12 more next actions/);
    assert.doesNotMatch(text, /Completion checklist:/);
    assert.doesNotMatch(text, /Completed milestones:/);
    assert.doesNotMatch(text, /Local verification:/);
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
  }
});
