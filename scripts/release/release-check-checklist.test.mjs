import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchValidationCommand,
  createProductionSmokeManualDispatchInstruction,
  createProductionSmokeRequestCommand,
} from "../smoke/production-smoke-dispatch-command.mjs";
import {
  createReleaseEvidenceReadinessChecklist,
  formatReleaseEvidenceReadinessChecklist,
} from "./release-check.mjs";

const missingProductionSmokeAction = [
  "Run pnpm smoke:request, validate the filled workflow_dispatch inputs",
  "with pnpm smoke:dispatch -- --require-complete, then run the",
  "Production Smoke workflow against the production environment.",
].join(" ");

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
    visualArtifact: createCompleteVisualArtifact(),
  });
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.equal(checklist.releaseReady, true);
  assert.match(lines, /Production Smoke report: ready/);
  assert.match(lines, /Page Builder Visual evidence: ready/);
  assert.match(
    lines,
    /Detail: 6\/6 components, 12\/12 viewports, artifact complete \(reports\/visual\/page-builder-fixture, 0 issues, 6\/6 files, 12\/12 screenshots, references ready \(0 missing, 0 updates, 12\/12 required source references available\)\)/,
  );
  assert.match(lines, /Release notes record: ready to generate/);
  assert.match(lines, /Steps:/);
  assert.match(lines, /Command: pnpm release:notes -- --release-tag <tag>/);
  assert.match(
    lines,
    /Evidence args: --smoke-artifact production-smoke-report-<run_number>/,
  );
  assert.match(lines, /--local-verification-run-url <main-ci-run-url>/);
  assert.match(
    lines,
    /--local-verification-artifact local-verification-<run_number>/,
  );
  assert.match(lines, /Local verification args:/);
  assert.match(lines, /Project and visual args:/);
  assert.match(lines, /Output: docs\/releases\/<tag>\.md/);
  assert.match(lines, /Keep artifact: release-notes-<run_number>/);
  assert.match(lines, /Formal mode: Run without --allow-blocked/);
});

test("release readiness checklist carries blocker actions", () => {
  const dispatchCommand = createProductionSmokeDispatchCommand();
  const validationCommand = createProductionSmokeDispatchValidationCommand();
  const checklist = createReleaseEvidenceReadinessChecklist({
    blockers: [
      {
        action: missingProductionSmokeAction,
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
    visualArtifact: createInvalidVisualArtifact(),
    visualArtifactDir: "reports/visual/page-builder-fixture",
    visualChecklist: createVisualChecklist(),
  });
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.equal(checklist.releaseReady, false);
  assert.match(
    lines,
    /pnpm smoke:request.*pnpm smoke:dispatch -- --require-complete.*Production Smoke workflow/,
  );
  assert.ok(
    lines.includes(
      `Manual dispatch: ${createProductionSmokeManualDispatchInstruction()}`,
    ),
  );
  assert.ok(lines.includes(`Smoke request: ${createProductionSmokeRequestCommand()}`));
  assert.ok(lines.includes(`Validate dispatch: ${validationCommand}`));
  assert.ok(lines.includes(`Dispatch template: ${dispatchCommand}`));
  assert.match(lines, /Run pnpm visual:acceptance -- --checklist/);
  assert.match(
    lines,
    /Detail: 0\/6 components, 0\/12 viewports, artifact invalid \(reports\/visual\/page-builder-fixture, 1 issues, 5\/6 files, 0\/12 screenshots, references invalid \(12 missing, 0 updates, 0\/12 required source references available\)\)/,
  );
  assert.match(lines, /Visual tasks:/);
  assert.match(lines, /hero-banner\.desktop: missing designReference/);
  assert.match(
    lines,
    /Bundle: pnpm visual:artifact-bundle -- --artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(
    lines,
    /Reference: docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
  );
  assert.match(
    lines,
    /Preview: artifacts\/visual\/page-builder-visual-fixture-hero-banner-desktop\.png \(1440x1000\)/,
  );
  assert.match(lines, /Reference report: pnpm visual:references/);
  assert.match(lines, /visual-reference-import-report\.md/);
  assert.match(lines, /Capture: pnpm visual:capture:fixture/);
  assert.match(lines, /Accept passing: pnpm visual:measure -- --write --accept-passing --require-complete/);
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

test("release readiness checklist formatter can preserve full task command lines", () => {
  const endMarker = "final-full-visual-task-marker";
  const longCommand = [
    "pnpm",
    "visual:measure",
    "--",
    "--write --require-complete ".repeat(24),
    endMarker,
  ].join(" ");
  const checklist = {
    items: [
      {
        label: "Page Builder Visual evidence",
        status: "needs-evidence",
        tasks: {
          hiddenCount: 0,
          items: [
            {
              capture: longCommand,
              component: "spec-table",
              expectedDesignReference:
                "docs/visual/page-builder-references/spec-table-mobile.png",
              expectedPreviewScreenshot:
                "artifacts/visual/page-builder-visual-fixture-spec-table-mobile.png",
              expectedPreviewScreenshotSize: {
                height: 1000,
                width: 390,
              },
              acceptPassing: longCommand,
              importReference: longCommand,
              measure: longCommand,
              missing: ["designReference"],
              verify: longCommand,
              viewport: "mobile",
            },
          ],
        },
      },
    ],
    releaseReady: false,
  };

  const truncatedText = formatReleaseEvidenceReadinessChecklist(checklist).join(
    "\n",
  );
  const fullText = formatReleaseEvidenceReadinessChecklist(checklist, {
    truncateLines: false,
  }).join("\n");

  assert.equal(truncatedText.includes(endMarker), false);
  assert.equal(fullText.includes(endMarker), true);
});

function createCompleteVisualArtifact() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    referenceImport: createReferenceImportSummary(true),
    requiredFileCount: 6,
    status: "complete",
  };
}

function createInvalidVisualArtifact() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 1,
    presentRequiredFileCount: 5,
    presentScreenshotCount: 0,
    referenceImport: createReferenceImportSummary(false),
    requiredFileCount: 6,
    status: "invalid",
  };
}

function createReferenceImportSummary(complete) {
  return {
    complete,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missingCount: complete ? 0 : 12,
    missingReferences: complete ? [] : ["docs/visual/page-builder-references/hero-banner-desktop.png"],
    requiredReferenceCount: 12,
    requiredReferenceEntryCount: 12,
    requiredReferenceStatusCounts: createRequiredReferenceStatusCounts(complete),
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: complete ? "ready" : "invalid",
    updated: false,
    updateCount: 0,
  };
}

function createRequiredReferenceStatusCounts(complete) {
  return {
    invalid: 0,
    missing: complete ? 0 : 12,
    ready: complete ? 12 : 0,
    updated: 0,
    wouldUpdate: 0,
  };
}

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
      acceptPassing:
        "pnpm visual:measure -- --write --accept-passing --require-complete",
      capture: `pnpm visual:capture:fixture -- --component ${component} --viewport ${viewport} --write-manifest`,
      importReference:
        "pnpm visual:references -- --write --require-complete",
      measure: "pnpm visual:measure -- --write --require-complete",
      referenceReport:
        "pnpm visual:references -- --output artifacts/visual/visual-reference-import-report.json --markdown-output artifacts/visual/visual-reference-import-report.md --require-complete",
      verify: "pnpm visual:acceptance -- --require-accepted",
    },
    component,
    expectedDesignReference: `docs/visual/page-builder-references/${component}-${viewport}.png`,
    expectedPreviewScreenshot: `artifacts/visual/page-builder-visual-fixture-${component}-${viewport}.png`,
    expectedPreviewScreenshotSize: createExpectedPreviewScreenshotSize(
      viewport,
    ),
    missing: ["designReference"],
    ready: false,
    viewport,
  };
}

function createExpectedPreviewScreenshotSize(viewport) {
  return {
    height: 1000,
    width: viewport === "desktop" ? 1440 : 390,
  };
}
