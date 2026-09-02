import assert from "node:assert/strict";
import test from "node:test";
import {
  releaseRequestsManifestSchemaVersion,
} from "./release-requests-manifest-schema.mjs";
import {
  assertReleaseRequestsManifest,
} from "./release-requests-manifest-validation.mjs";

test("release requests manifest validation accepts a complete handoff", () => {
  assert.doesNotThrow(() =>
    assertReleaseRequestsManifest(createValidReleaseRequestsManifest()),
  );
});

test("release requests manifest validation rejects schema drift", () => {
  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.schemaVersion = "release-requests-manifest.v0";
        }),
      ),
    /Release requests manifest schemaVersion must be release-requests-manifest\.v1/u,
  );
});

test("release requests manifest validation rejects release state drift", () => {
  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.status = "ready";
        }),
      ),
    /Release requests manifest status must match releaseEvidence\.ready/u,
  );

  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.projectCompletion.releaseReady = true;
        }),
      ),
    /Release requests manifest projectCompletion\.releaseReady must match releaseEvidence\.ready/u,
  );

  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.releaseEvidence.decision = "ready-to-release";
        }),
      ),
    /Release requests manifest releaseEvidence\.decision must match releaseEvidence\.ready/u,
  );
});

test("release requests manifest validation rejects count drift", () => {
  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.pageBuilderVisual.missingCount = 2;
        }),
      ),
    /Release requests manifest pageBuilderVisual\.missingCount/u,
  );

  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.projectCompletion.completionChecklist.completeCount = 2;
        }),
      ),
    /Release requests manifest projectCompletion\.completionChecklist\.completeCount/u,
  );

  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.projectCompletion.nextActionPreviewCount = 2;
        }),
      ),
    /Release requests manifest projectCompletion\.nextActionPreviewCount/u,
  );

  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.productionSmoke.inputCount = 2;
        }),
      ),
    /Release requests manifest productionSmoke\.inputCount/u,
  );
});

test("release requests manifest validation rejects incomplete dispatch context", () => {
  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.productionSmoke.dispatchManifestContext.inheritedFields = [
            "workflowFile",
            "ref",
          ];
        }),
      ),
    /Release requests manifest productionSmoke\.dispatchManifestContext\.inheritedFields must include inputs/u,
  );

  assert.throws(
    () =>
      assertReleaseRequestsManifest(
        createChangedManifest((manifest) => {
          manifest.productionSmoke.readyToDispatch = true;
        }),
      ),
    /Release requests manifest productionSmoke\.readyToDispatch must not be true while inputs are missing/u,
  );
});

function createChangedManifest(change) {
  const manifest = structuredClone(createValidReleaseRequestsManifest());

  change(manifest);

  return manifest;
}

function createValidReleaseRequestsManifest() {
  return {
    command: "pnpm release:requests",
    generatedAt: "2026-09-01T00:00:00.000Z",
    outputPaths: {
      releaseRequestsManifest: "artifacts/release/release-requests-manifest.json",
    },
    pageBuilderVisual: createPageBuilderVisualHandoff(),
    projectCompletion: createProjectCompletionHandoff(),
    productionSmoke: createProductionSmokeHandoff(),
    releaseEvidence: {
      blockerCount: 2,
      decision: "not-ready",
      ready: false,
      requestPath: "artifacts/release/release-evidence-request.md",
      status: "needs-evidence",
    },
    schemaVersion: releaseRequestsManifestSchemaVersion,
    status: "needs-evidence",
  };
}

function createPageBuilderVisualHandoff() {
  return {
    commands: {
      importReferences: "pnpm visual:references -- --write --require-complete",
      missingPaths: "pnpm --silent visual:references:missing",
      request: "pnpm visual:references:request",
    },
    firstMissingReference:
      "docs/visual/page-builder-references/hero-banner-desktop.png",
    missingCount: 1,
    missingReferences: [
      "docs/visual/page-builder-references/hero-banner-desktop.png",
    ],
    referenceExportManifestPath:
      "artifacts/visual/page-builder-reference-export-manifest.json",
    referenceExportTablePath:
      "artifacts/visual/page-builder-reference-export-table.tsv",
    referenceHandoffOutputDir:
      "artifacts/visual/page-builder-reference-handoff",
    referenceRequestPath: "artifacts/visual/page-builder-reference-request.md",
    requiredReferenceCount: 12,
    status: "needs-evidence",
  };
}

function createProjectCompletionHandoff() {
  return {
    completedMilestoneCount: 1,
    completionChecklist: {
      completeCount: 1,
      itemCount: 2,
      items: [
        {
          evidence: "Local MVP implementation is complete.",
          label: "Local MVP implementation scope",
          nextAction: null,
          status: "complete",
        },
        {
          evidence: "No retained production Smoke report has passed.",
          label: "Production Smoke release evidence",
          nextAction: "Run pnpm smoke:request.",
          status: "needs-evidence",
        },
      ],
      needsEvidenceCount: 1,
    },
    localMvpScope: "implemented",
    nextActionCount: 2,
    nextActionPreview: [
      {
        action: "Run pnpm smoke:request.",
        area: "Production Smoke",
        firstStep: {
          label: "Smoke request",
          value: "pnpm smoke:request",
        },
        label: "Production smoke artifact missing",
        stepCount: 1,
      },
    ],
    nextActionPreviewCount: 1,
    phase: "MVP release verification",
    releaseDecision: "not-ready",
    releaseEvidenceStatus: "needs-evidence",
    releaseReady: false,
    status: "needs-evidence",
    summary: "MVP implementation is in release verification.",
    truncatedNextActionCount: 1,
  };
}

function createProductionSmokeHandoff() {
  return {
    dispatchCommand: "gh workflow run production-smoke.yml --ref main",
    dispatchManifestContext: {
      inheritedFields: ["workflowFile", "ref", "inputs"],
      overridePolicy:
        "Explicit --workflow-file, --ref, and input flags override JSON manifest values.",
      summary:
        "JSON input manifest carries workflow file, ref, and input values.",
    },
    inputCount: 1,
    inputSources: [
      {
        name: "visual_artifact_name",
        source: "Page Builder Visual workflow artifact",
        value: "page-builder-visual-fixture-<run_number>",
      },
    ],
    inputs: [
      {
        name: "visual_artifact_name",
        placeholder: true,
        source: "Page Builder Visual workflow artifact",
        status: "missing",
        value: "page-builder-visual-fixture-<run_number>",
        workflowDescription: "Page Builder Visual artifact name",
        workflowRequired: false,
      },
    ],
    inputsManifestPath:
      "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
    inputsOutputPath:
      "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
    inputsTablePath:
      "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
    missingInputCount: 1,
    missingInputs: ["visual_artifact_name"],
    readyToDispatch: false,
    ref: "main",
    requestPath: "artifacts/production-smoke/production-smoke-request.md",
    requiredEvidence: [
      {
        label: "Production smoke request",
        value: "pnpm smoke:request",
      },
    ],
    validationCommand:
      "pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete",
    workflowFile: "production-smoke.yml",
    workflowInputs: [
      {
        description: "Page Builder Visual artifact name",
        name: "visual_artifact_name",
        required: false,
        value: "page-builder-visual-fixture-<run_number>",
      },
    ],
  };
}
