import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertProjectStatusArtifact,
  createProjectStatusArtifact,
  createProjectStatusMarkdown,
  formatProjectStatusArtifact,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status exposes smoke Markdown companion status", () => {
  const check = createBlockedCheck();
  check.smoke.markdown = createMissingSmokeMarkdownSummary();

  const artifact = createProjectStatusArtifact(check, {
    generatedAt: "2026-08-30T00:00:00.000Z",
  });
  const text = formatProjectStatusArtifact(artifact).join("\n");
  const markdown = createProjectStatusMarkdown(artifact);

  assert.deepEqual(artifact.releaseGate.smoke.markdown, {
    issueCount: 1,
    path: "artifacts/production-smoke/smoke-report.md",
    status: "missing",
  });
  assert.match(
    text,
    /Production Smoke: blocked \(missing\), Markdown missing \(artifacts\/production-smoke\/smoke-report\.md\)/,
  );
  assert.match(
    markdown,
    /Production Smoke: blocked \(missing\), Markdown missing \(artifacts\/production-smoke\/smoke-report\.md\)/,
  );
  assert.match(markdown, /### Missing Production Smoke Evidence/);
  assert.match(
    markdown,
    /Workflow: `GitHub Actions Production Smoke against the production environment`/,
  );
  assert.match(
    markdown,
    /Production smoke request: `pnpm smoke:request`/,
  );
  assert.match(
    markdown,
    /Dispatch inputs output: `artifacts\/production-smoke\/production-smoke-dispatch-inputs\.txt`/,
  );
  assert.match(
    markdown,
    /Workflow dispatch validation: `pnpm smoke:dispatch -- --require-complete/,
  );
  assert.match(
    markdown,
    /Workflow dispatch template: `gh workflow run production-smoke\.yml --ref main/,
  );
  assert.match(
    markdown,
    /Smoke report JSON: `artifacts\/production-smoke\/smoke-report\.json`/,
  );
  assert.match(
    markdown,
    /Smoke artifact: `production-smoke-report-<run_number>`/,
  );
  assert.match(
    markdown,
    /Release evidence artifact: `release-evidence-check-<run_number>`/,
  );
  assert.match(
    markdown,
    /Markdown companion: `missing` \(`artifacts\/production-smoke\/smoke-report\.md`\)/,
  );
  assertMissingSmokeEvidenceOrder(markdown);
});

test("project status omits missing smoke evidence section when smoke is ready", () => {
  const check = createBlockedCheck();
  check.blockers = check.blockers.filter(
    (blocker) => blocker.area !== "Production Smoke",
  );
  check.smoke.markdown = {
    issueCount: 0,
    path: "artifacts/production-smoke/smoke-report.md",
    status: "complete",
  };
  check.smoke.path = "artifacts/production-smoke/smoke-report.json";
  check.smoke.releaseReady = true;
  check.smoke.summary.status = "passed";

  const artifact = createProjectStatusArtifact(check, {
    generatedAt: "2026-08-30T00:00:00.000Z",
  });
  const markdown = createProjectStatusMarkdown(artifact);

  assert.doesNotMatch(markdown, /### Missing Production Smoke Evidence/);
});

test("project status rejects ready smoke with blocked Markdown companion", () => {
  const check = createBlockedCheck();
  check.blockers = check.blockers.filter(
    (blocker) => blocker.area !== "Production Smoke",
  );
  check.smoke.markdown = createMissingSmokeMarkdownSummary();
  check.smoke.releaseReady = true;
  check.smoke.summary.status = "passed";

  const artifact = createProjectStatusArtifact(check, {
    generatedAt: "2026-08-30T00:00:00.000Z",
  });

  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /releaseGate\.smoke\.markdown\.status must be one of: complete/,
  );
});

test("project status docs mention missing smoke evidence handoff", async () => {
  const [readme, setupDoc, releaseChecklist] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(readme, /Missing Production Smoke Evidence/);
  assert.match(readme, /Smoke JSON \/ Markdown/);
  assert.match(readme, /release-check\.md.*project-status\.md/s);
  assert.match(setupDoc, /Missing Production Smoke Evidence/);
  assert.match(setupDoc, /release-check\.md.*project-status\.md/s);
  assert.match(setupDoc, /manual GitHub\s+Actions dispatch path/s);
  assert.match(setupDoc, /preflight artifact,\s+release\s+evidence artifact/s);
  assert.match(releaseChecklist, /Missing Production Smoke Evidence/);
  assert.match(releaseChecklist, /release-check\.md.*project-status\.md/s);
  assert.match(
    releaseChecklist,
    /`pnpm smoke:request`\s+request, dispatch inputs output, `pnpm smoke:dispatch`\s+validation,\s+`gh` dispatch template, manual dispatch path, required workflow, and artifact names/s,
  );
});

function createMissingSmokeMarkdownSummary() {
  return {
    issueCount: 1,
    path: "artifacts/production-smoke/smoke-report.md",
    status: "missing",
  };
}

function assertMissingSmokeEvidenceOrder(markdown) {
  const section = readMissingSmokeEvidenceSection(markdown);
  const requestIndex = section.indexOf("Production smoke request:");
  const inputsOutputIndex = section.indexOf("Dispatch inputs output:");
  const validationIndex = section.indexOf("Workflow dispatch validation:");
  const templateIndex = section.indexOf("Workflow dispatch template:");
  const manualIndex = section.indexOf("Workflow manual dispatch:");
  const workflowIndex = section.indexOf(
    "Workflow: `GitHub Actions Production Smoke",
  );
  const indices = [
    requestIndex,
    inputsOutputIndex,
    validationIndex,
    templateIndex,
    manualIndex,
    workflowIndex,
  ];

  assert(
    indices.every((index) => index >= 0) &&
      requestIndex < inputsOutputIndex &&
      inputsOutputIndex < validationIndex &&
      validationIndex < templateIndex &&
      templateIndex < manualIndex &&
      manualIndex < workflowIndex,
    "missing smoke evidence should list request and validation before workflow execution",
  );
}

function readMissingSmokeEvidenceSection(markdown) {
  const start = markdown.indexOf("### Missing Production Smoke Evidence");
  const end = markdown.indexOf("### Production Smoke Workflow Inputs", start);

  assert(
    start >= 0 && end > start,
    "project status Markdown should include the missing smoke evidence section",
  );

  return markdown.slice(start, end);
}
