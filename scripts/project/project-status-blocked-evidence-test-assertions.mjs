import assert from "node:assert/strict";
import { projectStatusSchemaVersion } from "./project-status.mjs";

export function assertBlockedProjectStatusArtifact(artifact) {
  assert.equal(artifact.schemaVersion, projectStatusSchemaVersion);
  assert.equal(artifact.status, "needs-evidence");
  assert.equal(artifact.releaseReady, false);
  assert.deepEqual(artifact.completionSummary, {
    localMvpScope: "implemented",
    releaseDecision: "not-ready",
    releaseEvidenceStatus: "needs-evidence",
    summary:
      "MVP implementation is in release verification; final completion still requires retained production smoke and Page Builder visual acceptance evidence.",
  });
  assert.equal(
    artifact.completedMilestones.includes(
      "Production deployment, environment variable matrix, and rollback runbook are documented for the MVP release path.",
    ),
    true,
  );
  assert.equal(artifact.releaseGate.smoke.status, "blocked");
  assert.equal(artifact.releaseGate.visual.status, "needs-evidence");
  assert.equal(artifact.releaseGate.visual.pendingTaskCount, 12);
  assert.equal(artifact.localVerification.commandCount, 7);
  assert.equal(artifact.nextActionLimit, 8);
  assert.equal(artifact.truncatedNextActionCount, 7);
  assert.deepEqual(
    artifact.localVerification.commands.map((item) => item.command),
    [
      "pnpm install --frozen-lockfile",
      "pnpm run check:file-size",
      "pnpm typecheck",
      "pnpm lint",
      "pnpm test",
      "pnpm build",
      "pnpm project:status -- --all-actions --output tmp/project-status.json --markdown-output tmp/project-status-handoff.md",
    ],
  );
  assert.equal(artifact.nextActionCount, 15);
  assert.equal(artifact.nextActions.length, 8);
  assertSmokeNextAction(artifact.nextActions[0]);
  assertVisualNextAction(artifact.nextActions[1]);
  assert.equal(
    artifact.nextActions.some((action) =>
      action.action.includes("pnpm visual:artifact-bundle"),
    ),
    true,
  );
  assert.equal(
    artifact.nextActions.some((action) => action.label === "hero-banner.desktop"),
    true,
  );
  assertHeroDesktopNextAction(artifact);
  assert.equal(artifact.nextActions[2].label, "Refresh evidence requests");
  assert.equal(
    artifact.nextActions[2].steps[0].value,
    "pnpm release:requests",
  );
}

function assertSmokeNextAction(smokeAction) {
  assert.equal(smokeAction.area, "Production Smoke");
  assert.deepEqual(
    smokeAction.steps.map((step) => step.label),
    [
      "Smoke request",
      "Smoke request output",
      "Dispatch inputs output",
      "Dispatch inputs table output",
      "Dispatch inputs JSON output",
      "Local verification inputs",
      "Visual evidence inputs",
      "Release note inputs",
      "Validate dispatch",
      "Dispatch manifest context",
      "Dispatch template",
      "Manual dispatch",
      "Run workflow",
      "Keep artifacts",
      "Rerun gate",
    ],
  );
  assert.equal(smokeAction.steps[0].value, "pnpm smoke:request");
  assert.equal(
    smokeAction.steps[1].value,
    "artifacts/production-smoke/production-smoke-request.md",
  );
  assert.equal(
    readStepValue(smokeAction, "Dispatch inputs output"),
    "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.equal(
    readStepValue(smokeAction, "Dispatch inputs table output"),
    "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
  );
  assert.equal(
    readStepValue(smokeAction, "Dispatch inputs JSON output"),
    "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  const validationCommand = readStepValue(smokeAction, "Validate dispatch");
  assert.equal(
    validationCommand,
    "pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete",
  );
  assert.equal(
    readStepValue(smokeAction, "Dispatch manifest context"),
    "JSON input manifest carries workflow file, ref, and input values; explicit CLI flags override manifest values.",
  );
  assert.match(
    readStepValue(smokeAction, "Dispatch template"),
    /^gh workflow run production-smoke\.yml --ref main /,
  );
  assert.equal(
    readStepValue(smokeAction, "Local verification inputs"),
    "local_verification_run_url=<main CI run URL>, local_verification_artifact_name=local-verification-<run_number>",
  );
  assert.equal(
    readStepValue(smokeAction, "Visual evidence inputs"),
    "visual_artifact_name=page-builder-visual-fixture-<run_number>, visual_artifact_run_id=<Page Builder Visual workflow run id>",
  );
  assert.equal(
    readStepValue(smokeAction, "Release note inputs"),
    "release_tag=<tag>, rollback_target=<target>, storefront_url=<public HTTPS storefront URL>",
  );
  assert.equal(
    readStepValue(smokeAction, "Keep artifacts"),
    "production-smoke-report-<run_number>, release-preflight-<run_number>, release-evidence-check-<run_number>, project-status-<run_number>",
  );
}

function assertVisualNextAction(visualAction) {
  assert.equal(visualAction.area, "Page Builder Visual");
  assert.deepEqual(
    visualAction.steps.map((step) => step.label),
    [
      "Reference source",
      "Missing paths",
      "Design request",
      "Design handoff package",
      "Design handoff output",
      "Design request output",
      "Missing paths output",
      "Export table output",
      "Export manifest output",
      "Reference report",
      "Import",
      "Capture fixture",
      "Measure",
      "Accept passing",
      "Verify",
      "Bundle artifact",
      "Check artifact",
      "Keep artifact",
    ],
  );
  assert.equal(
    readStepValue(visualAction, "Export table output"),
    "artifacts/visual/page-builder-reference-export-table.tsv",
  );
  assert.equal(
    readStepValue(visualAction, "Export manifest output"),
    "artifacts/visual/page-builder-reference-export-manifest.json",
  );
  assert.equal(
    readStepValue(visualAction, "Capture fixture"),
    "pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest",
  );
  assert.equal(
    visualAction.steps.at(-1).value,
    "page-builder-visual-fixture-<run_number>",
  );
  assert.equal(
    visualAction.steps.at(-2).value,
    "pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md",
  );
  assert.equal(visualAction.steps[1].value, "pnpm --silent visual:references:missing");
  assert.equal(visualAction.steps[2].value, "pnpm visual:references:request");
  assert.equal(
    readStepValue(visualAction, "Design handoff package"),
    "pnpm visual:references:handoff",
  );
  assert.equal(
    readStepValue(visualAction, "Design handoff output"),
    "artifacts/visual/page-builder-reference-handoff",
  );
  assert.equal(
    readStepValue(visualAction, "Missing paths output"),
    "artifacts/visual/page-builder-missing-references.txt",
  );
  assert.equal(
    readStepValue(visualAction, "Reference report"),
    "pnpm visual:references:check",
  );
}

function assertHeroDesktopNextAction(artifact) {
  const heroDesktopAction = artifact.nextActions.find(
    (action) => action.label === "hero-banner.desktop",
  );
  assert.deepEqual(
    heroDesktopAction.steps.map((step) => step.label),
    [
      "Reference",
      "Preview",
      "Capture",
      "Reference report",
      "Import",
      "Measure",
      "Accept passing",
      "Verify",
    ],
  );
  assert.equal(
    heroDesktopAction.steps.find((step) => step.label === "Preview").value,
    "artifacts/visual/page-builder-visual-fixture-hero-banner-desktop.png (1440x1000)",
  );
}

function readStepValue(action, label) {
  return action.steps.find((step) => step.label === label).value;
}
