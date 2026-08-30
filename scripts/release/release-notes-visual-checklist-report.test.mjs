import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import { createReadySmokeSource } from "./release-notes-test-fixtures.mjs";

test("release notes failure drafts include visual checklist tasks", () => {
  const markdown = createReleaseNotesMarkdown(
    createReleaseNotesConfig(),
    createBlockedReleaseArtifact(),
  );

  assert.match(markdown, /Mode: failure review draft/);
  assert.match(markdown, /Visual checklist tasks: 5 pending viewport tasks/);
  assert.match(
    markdown,
    /Visual task hero-banner\.desktop: missing designReference, previewScreenshot/,
  );
  assert.match(
    markdown,
    /Reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    /Capture: `pnpm visual:capture:fixture -- --component hero-banner --viewport desktop --write-manifest`/,
  );
  assert.match(
    markdown,
    /Reference report: `pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --markdown-output artifacts\/visual\/visual-reference-import-report\.md --require-complete`/,
  );
  assert.match(
    markdown,
    /Import: `pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --write --require-complete`/,
  );
  assert.match(
    markdown,
    /Accept passing: `pnpm visual:measure -- --write --accept-passing --require-complete`/,
  );
  assert.match(
    markdown,
    /Visual task: \.\.\. and 1 more pending viewport tasks/,
  );
});

function createReleaseNotesConfig() {
  return {
    ...readReleaseNotesCliConfig([
      "--release-tag",
      "v0.1.0",
      "--workflow-run-url",
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
      "--local-verification-run-url",
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456788",
      "--local-verification-artifact",
      "local-verification-122",
      "--smoke-artifact",
      "production-smoke-report-123",
      "--preflight-artifact",
      "release-preflight-123",
      "--release-artifact",
      "release-evidence-check-123",
      "--project-status-artifact",
      "project-status-123",
      "--visual-artifact",
      "page-builder-visual-fixture-123",
      "--storefront-url",
      "https://store.brand.com",
      "--rollback-target",
      "main@abcdef1",
    ]),
    allowBlocked: true,
  };
}

function createBlockedReleaseArtifact() {
  return {
    blockerCount: 1,
    blockers: [
      {
        action: "Attach real visual evidence.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: createBlockedReadinessChecklist(),
    releaseReady: false,
    schemaVersion: "release-evidence-check.v1",
    smoke: createReadySmokeArtifact(),
    status: "blocked",
    visual: createPendingVisualArtifact(),
  };
}

function createReadySmokeArtifact() {
  return {
    path: "artifacts/production-smoke/smoke-report.json",
    releaseReady: true,
    source: createReadySmokeSource(),
    status: "ready",
    summary: {
      checkCount: 42,
      failedCheckCount: 0,
      productionReady: true,
      status: "passed",
    },
    traceability: [],
  };
}

function createPendingVisualArtifact() {
  return {
    acceptedComponentCount: 0,
    acceptedViewportCount: 0,
    checklist: createVisualChecklist(),
    componentCount: 6,
    errorCount: 0,
    issueCount: 0,
    issues: [],
    manifestPath: "docs/development/page-builder-visual-acceptance.json",
    pendingComponents: ["hero-banner", "rich-text"],
    pendingViewports: ["hero-banner.desktop", "hero-banner.mobile"],
    status: "needs-evidence",
    viewportCount: 12,
    warningCount: 1,
  };
}

function createBlockedReadinessChecklist() {
  return {
    itemCount: 3,
    items: [],
    releaseReady: false,
  };
}

function createVisualChecklist() {
  const tasks = [
    createVisualTask("hero-banner", "desktop"),
    createVisualTask("hero-banner", "mobile"),
    createVisualTask("rich-text", "desktop"),
    createVisualTask("rich-text", "mobile"),
    createVisualTask("image-gallery", "desktop"),
  ];

  return {
    pendingTaskCount: tasks.length,
    pendingTasks: tasks,
    pendingViewportCount: tasks.length,
    readyViewportCount: 7,
    viewportCount: 12,
  };
}

function createVisualTask(component, viewport) {
  return {
    commands: {
      acceptPassing:
        "pnpm visual:measure -- --write --accept-passing --require-complete",
      capture: `pnpm visual:capture:fixture -- --component ${component} --viewport ${viewport} --write-manifest`,
      importReference:
        "pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete",
      measure: "pnpm visual:measure -- --write --require-complete",
      referenceReport:
        "pnpm visual:references -- --source-dir docs/visual/page-builder-references --markdown-output artifacts/visual/visual-reference-import-report.md --require-complete",
      verify: "pnpm visual:acceptance -- --require-accepted",
    },
    component,
    expectedDesignReference: `docs/visual/page-builder-references/${component}-${viewport}.png`,
    expectedPreviewScreenshot: `artifacts/visual/page-builder-visual-fixture-${component}-${viewport}.png`,
    missing: ["designReference", "previewScreenshot"],
    status: "needs-evidence",
    viewport,
  };
}
