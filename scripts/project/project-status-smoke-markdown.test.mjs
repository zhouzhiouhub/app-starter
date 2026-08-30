import assert from "node:assert/strict";
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

function createMissingSmokeMarkdownSummary() {
  return {
    issueCount: 1,
    path: "artifacts/production-smoke/smoke-report.md",
    status: "missing",
  };
}
