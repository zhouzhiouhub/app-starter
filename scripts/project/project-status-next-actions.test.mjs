import assert from "node:assert/strict";
import test from "node:test";
import { createProjectNextActions } from "./project-status-next-actions.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project next actions preserve visual artifact dir on release gate reruns", () => {
  const actions = createProjectNextActions({
    ...createBlockedCheck(),
    visualArtifactDir: "reports/visual/page-builder-fixture",
  });
  const productionSmoke = actions.find(
    (action) => action.label === "Production smoke artifact missing",
  );
  const rerunGate = productionSmoke.steps.find(
    (step) => step.label === "Rerun gate",
  );

  assert.equal(
    rerunGate.value,
    "pnpm release:check -- --smoke-report <path> --visual-artifact-dir reports/visual/page-builder-fixture",
  );
  assert.deepEqual(
    productionSmoke.steps.map((step) => step.label),
    [
      "Run workflow",
      "Manual dispatch",
      "Smoke request",
      "Smoke request output",
      "Dispatch inputs output",
      "Validate dispatch",
      "Dispatch template",
      "Local verification inputs",
      "Visual evidence inputs",
      "Release note inputs",
      "Keep artifacts",
      "Rerun gate",
    ],
  );
  assert.match(
    productionSmoke.steps[5].value,
    /^pnpm smoke:dispatch -- --require-complete /,
  );
  assert.match(
    productionSmoke.steps[5].value,
    /--local-verification-artifact "local-verification-<run_number>"/,
  );
  assert.match(
    productionSmoke.steps[6].value,
    /^gh workflow run production-smoke\.yml --ref main /,
  );
  assert.equal(
    productionSmoke.steps[1].value,
    "GitHub Actions > Production Smoke > Run workflow, then use the listed workflow_dispatch inputs.",
  );
  assert.equal(productionSmoke.steps[2].value, "pnpm smoke:request");
  assert.equal(
    productionSmoke.steps[3].value,
    "artifacts/production-smoke/production-smoke-request.md",
  );
  assert.equal(
    productionSmoke.steps[4].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.match(
    productionSmoke.steps[6].value,
    /-f visual_artifact_run_id="<Page Builder Visual workflow run id>"/,
  );
  assert.equal(
    productionSmoke.steps[7].value,
    "local_verification_run_url=<main CI run URL>, local_verification_artifact_name=local-verification-<run_number>",
  );
  assert.equal(
    productionSmoke.steps[8].value,
    "visual_artifact_name=page-builder-visual-fixture-<run_number>, visual_artifact_run_id=<Page Builder Visual workflow run id>",
  );
  assert.equal(
    productionSmoke.steps[9].value,
    "release_tag=<tag>, rollback_target=<target>, storefront_url=<public HTTPS storefront URL>",
  );
});

test("project next actions include copy-ready missing visual reference paths", () => {
  const actions = createProjectNextActions({
    ...createBlockedCheck(),
    visualArtifactDir: "reports/visual/page-builder-fixture",
  });
  const visual = actions.find(
    (action) => action.label === "Visual acceptance pending",
  );
  const missingPaths = visual.steps.find(
    (step) => step.label === "Missing paths",
  );

  assert.equal(missingPaths.value, "pnpm --silent visual:references:missing");
  assert.deepEqual(
    visual.steps.slice(0, 6).map((step) => step.label),
    [
      "Reference source",
      "Missing paths",
      "Design request",
      "Design request output",
      "Missing paths output",
      "Reference report",
    ],
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design request").value,
    "pnpm visual:references:request",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design request output").value,
    "artifacts/visual/page-builder-reference-request.md",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Missing paths output").value,
    "artifacts/visual/page-builder-missing-references.txt",
  );
});

test("project next actions include unified release evidence request", () => {
  const actions = createProjectNextActions(createBlockedCheck());
  const releaseEvidence = actions.find(
    (action) => action.label === "Refresh evidence requests",
  );

  assert.equal(releaseEvidence.area, "Release Evidence");
  assert.deepEqual(
    releaseEvidence.steps.map((step) => step.label),
    [
      "Refresh requests",
      "Refresh requests output",
      "Evidence request",
      "Evidence request output",
      "Design request",
      "Design request output",
      "Smoke request",
      "Smoke request output",
      "Dispatch inputs output",
      "Final gate",
    ],
  );
  assert.equal(
    releaseEvidence.steps[0].value,
    "pnpm release:requests",
  );
  assert.equal(
    releaseEvidence.steps[1].value,
    "artifacts/release/release-evidence-request.md, artifacts/visual/page-builder-reference-request.md, artifacts/visual/page-builder-missing-references.txt, artifacts/production-smoke/production-smoke-request.md, artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.equal(
    releaseEvidence.steps[2].value,
    "pnpm release:evidence-request",
  );
  assert.equal(
    releaseEvidence.steps[3].value,
    "artifacts/release/release-evidence-request.md",
  );
  assert.equal(
    releaseEvidence.steps[4].value,
    "pnpm visual:references:request",
  );
  assert.equal(
    releaseEvidence.steps[5].value,
    "artifacts/visual/page-builder-reference-request.md",
  );
  assert.equal(releaseEvidence.steps[6].value, "pnpm smoke:request");
  assert.equal(
    releaseEvidence.steps[7].value,
    "artifacts/production-smoke/production-smoke-request.md",
  );
  assert.equal(
    releaseEvidence.steps[8].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.match(
    releaseEvidence.steps[9].value,
    /^pnpm release:handoff -- --require-ready /,
  );
});

test("project next actions structure the ready release notes handoff", () => {
  const [releaseNotesAction] = createProjectNextActions({
    releaseReady: true,
  });

  assert.equal(releaseNotesAction.area, "Release Notes");
  assert.equal(releaseNotesAction.label, "Generate release record");
  assert.deepEqual(
    releaseNotesAction.steps.map((step) => step.label),
    [
      "Command",
      "Evidence args",
      "Local verification args",
      "Project and visual args",
      "Review args",
      "Input evidence",
      "Output",
      "Keep artifact",
      "Formal mode",
    ],
  );
  assert.match(releaseNotesAction.steps[0].value, /pnpm release:notes --/);
  assert.match(
    releaseNotesAction.steps[2].value,
    /--local-verification-artifact local-verification-<run_number>/,
  );
  assert.match(
    releaseNotesAction.steps[3].value,
    /--project-status artifacts\/release\/project-status\.json/,
  );
  assert.equal(
    releaseNotesAction.steps[5].value,
    "artifacts/release/release-check.json, artifacts/release/project-status.json",
  );
  assert.equal(releaseNotesAction.steps[6].value, "docs/releases/<tag>.md");
  assert.equal(
    releaseNotesAction.steps[7].value,
    "release-notes-<run_number>",
  );
  assert.match(releaseNotesAction.steps[8].value, /without --allow-blocked/);
});
