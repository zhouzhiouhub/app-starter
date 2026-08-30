import assert from "node:assert/strict";
import test from "node:test";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";

test("release notes validates smoke Markdown artifact shape", () => {
  const artifact = createReleaseArtifactWithSmokeMarkdown({
    issueCount: 0,
    issues: [],
    path: "artifacts/production-smoke/smoke-report.md",
    status: "complete",
  });

  assert.doesNotThrow(() => assertReleaseEvidenceCheckArtifact(artifact));
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: {
          ...artifact.smoke,
          markdown: { ...artifact.smoke.markdown, status: "ready" },
        },
      }),
    /smoke\.markdown\.status must be one of/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: {
          ...artifact.smoke,
          markdown: {
            ...artifact.smoke.markdown,
            issueCount: 0,
            issues: [createSmokeMarkdownIssue()],
          },
        },
      }),
    /smoke\.markdown\.issueCount must cover serialized issues/,
  );
});

test("release notes rejects ready evidence with blocked smoke Markdown", () => {
  const artifact = createReleaseArtifactWithSmokeMarkdown({
    issueCount: 1,
    issues: [createSmokeMarkdownIssue()],
    path: "artifacts/production-smoke/smoke-report.md",
    status: "missing",
  });

  assert.throws(
    () => assertReleaseEvidenceCheckArtifact(artifact),
    /complete production smoke Markdown when recorded/,
  );
});

function createReleaseArtifactWithSmokeMarkdown(markdown) {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: {
      itemCount: 2,
      items: [
        {
          action: null,
          detail: "Report path: artifacts/production-smoke/smoke-report.json",
          label: "Production Smoke report",
          status: "ready",
        },
        {
          action: null,
          detail: "6/6 components, 12/12 viewports",
          label: "Page Builder Visual evidence",
          status: "ready",
        },
      ],
      releaseReady: true,
    },
    releaseReady: true,
    schemaVersion: "release-evidence-check.v1",
    smoke: {
      markdown,
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
      source: {
        commitSha: "0123456789abcdef0123456789abcdef01234567",
        repository: "zhouzhiouhub/app-starter",
        runId: "123456789",
        runNumber: "123",
        workflow: "Production Smoke",
        workflowRunUrl:
          "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
      },
      status: "ready",
      summary: {
        checkCount: 42,
        failedCheckCount: 0,
        productionReady: true,
        status: "passed",
      },
      traceability: [],
    },
    status: "ready",
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      componentCount: 6,
      errorCount: 0,
      issueCount: 0,
      issues: [],
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      pendingComponents: [],
      pendingViewports: [],
      status: "accepted",
      viewportCount: 12,
      warningCount: 0,
    },
  };
}

function createSmokeMarkdownIssue() {
  return {
    code: "smoke_report_markdown_missing",
    message: "Expected smoke report Markdown companion.",
    severity: "error",
  };
}
