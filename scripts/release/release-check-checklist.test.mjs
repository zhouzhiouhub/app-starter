import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseEvidenceReadinessChecklist,
  formatReleaseEvidenceReadinessChecklist,
} from "./release-check.mjs";

test("release readiness checklist summarizes ready evidence", () => {
  const checklist = createReleaseEvidenceReadinessChecklist({
    blockers: [],
    releaseReady: true,
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
    },
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      componentCount: 6,
      status: "accepted",
      viewportCount: 12,
    },
  });
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.equal(checklist.releaseReady, true);
  assert.match(lines, /Production Smoke report: ready/);
  assert.match(lines, /Page Builder Visual evidence: ready/);
  assert.match(lines, /Release notes record: ready to generate/);
});

test("release readiness checklist carries blocker actions", () => {
  const checklist = createReleaseEvidenceReadinessChecklist({
    blockers: [
      {
        action: "Run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "missing",
      },
      {
        action: "Run pnpm visual:acceptance -- --checklist.",
        area: "Page Builder Visual",
        label: "invalid",
      },
    ],
    releaseReady: false,
    smoke: {
      path: null,
      releaseReady: false,
    },
    visual: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      componentCount: 6,
      status: "invalid",
      viewportCount: 12,
    },
    visualChecklist: createVisualChecklist(),
  });
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.equal(checklist.releaseReady, false);
  assert.match(lines, /Run the Production Smoke workflow/);
  assert.match(lines, /Run pnpm visual:acceptance -- --checklist/);
  assert.match(lines, /Visual tasks:/);
  assert.match(lines, /hero-banner\.desktop: missing designReference/);
  assert.match(
    lines,
    /Reference: docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
  );
  assert.match(lines, /Capture: pnpm visual:capture:fixture/);
  assert.match(lines, /\.\.\. and 1 more visual viewport tasks/);
  assert.match(lines, /Use --all-visual-tasks with --checklist/);
  assert.match(lines, /Release notes record: waiting for evidence/);
});

test("release readiness checklist can include every visual task", () => {
  const checklist = createReleaseEvidenceReadinessChecklist(
    {
      blockers: [
        {
          action: "Run pnpm visual:acceptance -- --checklist.",
          area: "Page Builder Visual",
          label: "invalid",
        },
      ],
      releaseReady: false,
      smoke: {
        path: "artifacts/production-smoke/smoke-report.json",
        releaseReady: true,
      },
      visual: {
        acceptedComponentCount: 0,
        acceptedViewportCount: 0,
        componentCount: 6,
        status: "needs-evidence",
        viewportCount: 12,
      },
      visualChecklist: createVisualChecklist(),
    },
    { includeAllVisualTasks: true },
  );
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.match(lines, /hero-banner\.desktop/);
  assert.match(lines, /rich-text\.desktop/);
  assert.doesNotMatch(lines, /\.\.\. and \d+ more visual viewport tasks/);
});

function createVisualChecklist() {
  return {
    components: [
      {
        component: "hero-banner",
        viewports: [
          createVisualTask("hero-banner", "desktop"),
          createVisualTask("hero-banner", "mobile"),
        ],
      },
      {
        component: "rich-text",
        viewports: [createVisualTask("rich-text", "desktop")],
      },
    ],
  };
}

function createVisualTask(component, viewport) {
  return {
    commands: {
      capture: `pnpm visual:capture:fixture -- --component ${component} --viewport ${viewport} --write-manifest`,
      importReference:
        "pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete",
      measure: "pnpm visual:measure -- --write --require-complete",
      verify: "pnpm visual:acceptance -- --require-accepted",
    },
    component,
    expectedDesignReference: `docs/visual/page-builder-references/${component}-${viewport}.png`,
    expectedPreviewScreenshot: `artifacts/visual/page-builder-visual-fixture-${component}-${viewport}.png`,
    missing: ["designReference"],
    ready: false,
    viewport,
  };
}
