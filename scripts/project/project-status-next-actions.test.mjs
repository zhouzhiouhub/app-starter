import assert from "node:assert/strict";
import test from "node:test";
import { createProjectNextActions } from "./project-status-next-actions.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project next actions preserve full blocker action text", () => {
  const longAction = createLongProjectActionText();
  const actions = createProjectNextActions({
    ...createBlockedCheck(),
    blockers: [
      {
        action: longAction,
        area: "Production Smoke",
        label: "Production smoke artifact missing",
      },
    ],
  });
  const productionSmoke = actions.find(
    (action) => action.label === "Production smoke artifact missing",
  );

  assert.equal(productionSmoke.action, longAction);
  assert.equal(productionSmoke.action.includes("..."), false);
});

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
  assert.match(
    readStepValue(productionSmoke, "Validate dispatch"),
    /^pnpm smoke:dispatch -- --inputs-json artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json --require-complete$/,
  );
  assert.match(
    readStepValue(productionSmoke, "Validate dispatch"),
    /--inputs-json artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json/,
  );
  assert.equal(
    readStepValue(productionSmoke, "Dispatch manifest context"),
    "JSON input manifest carries workflow file, ref, and input values; explicit CLI flags override manifest values.",
  );
  assert.match(
    readStepValue(productionSmoke, "Dispatch template"),
    /^gh workflow run production-smoke\.yml --ref main /,
  );
  assert.equal(
    readStepValue(productionSmoke, "Manual dispatch"),
    "GitHub Actions > Production Smoke > Run workflow, then use the listed workflow_dispatch inputs.",
  );
  assert.equal(productionSmoke.steps[0].value, "pnpm smoke:request");
  assert.equal(
    productionSmoke.steps[1].value,
    "artifacts/production-smoke/production-smoke-request.md",
  );
  assert.equal(
    productionSmoke.steps[2].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.equal(
    productionSmoke.steps[3].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
  );
  assert.equal(
    readStepValue(productionSmoke, "Dispatch inputs JSON output"),
    "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.match(
    readStepValue(productionSmoke, "Dispatch template"),
    /-f visual_artifact_run_id="<Page Builder Visual workflow run id>"/,
  );
  assert.equal(
    readStepValue(productionSmoke, "Local verification inputs"),
    "local_verification_run_url=<main CI run URL>, local_verification_artifact_name=local-verification-<run_number>",
  );
  assert.equal(
    readStepValue(productionSmoke, "Visual evidence inputs"),
    "visual_artifact_name=page-builder-visual-fixture-<run_number>, visual_artifact_run_id=<Page Builder Visual workflow run id>",
  );
  assert.equal(
    readStepValue(productionSmoke, "Release note inputs"),
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
    visual.steps.slice(0, 11).map((step) => step.label),
    [
      "Reference source",
      "Missing paths",
      "Design request",
      "Design handoff package",
      "Design handoff output",
      "Design handoff README",
      "Design request output",
      "Missing paths output",
      "Export table output",
      "Export manifest output",
      "Reference report",
    ],
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design request").value,
    "pnpm visual:references:request",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design handoff package").value,
    "pnpm visual:references:handoff",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design handoff output").value,
    "artifacts/visual/page-builder-reference-handoff",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design handoff README").value,
    "artifacts/visual/page-builder-reference-handoff/README.md",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Design request output").value,
    "artifacts/visual/page-builder-reference-request.md",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Missing paths output").value,
    "artifacts/visual/page-builder-missing-references.txt",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Export table output").value,
    "artifacts/visual/page-builder-reference-export-table.tsv",
  );
  assert.equal(
    visual.steps.find((step) => step.label === "Export manifest output").value,
    "artifacts/visual/page-builder-reference-export-manifest.json",
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
      "Release requests manifest output",
      "Evidence request",
      "Evidence request output",
      "Design request",
      "Design handoff package",
      "Design handoff output",
      "Design handoff README",
      "Design request output",
      "Export table output",
      "Export manifest output",
      "Smoke request",
      "Smoke request output",
      "Dispatch inputs output",
      "Dispatch inputs table output",
      "Dispatch inputs JSON output",
      "Final gate",
    ],
  );
  assert.equal(
    releaseEvidence.steps[0].value,
    "pnpm release:requests",
  );
  assert.equal(
    releaseEvidence.steps[1].value,
    "artifacts/release/release-evidence-request.md, artifacts/release/release-requests-manifest.json, artifacts/release/project-status.json, artifacts/release/project-status.md, artifacts/visual/page-builder-reference-request.md, artifacts/visual/page-builder-missing-references.txt, artifacts/visual/page-builder-reference-export-table.tsv, artifacts/visual/page-builder-reference-export-manifest.json, artifacts/visual/page-builder-reference-handoff, artifacts/visual/page-builder-reference-handoff/README.md, artifacts/production-smoke/production-smoke-request.md, artifacts/production-smoke/production-smoke-dispatch-inputs.txt, artifacts/production-smoke/production-smoke-dispatch-inputs.tsv, artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.equal(
    releaseEvidence.steps[2].value,
    "artifacts/release/release-requests-manifest.json",
  );
  assert.equal(
    releaseEvidence.steps[3].value,
    "pnpm release:evidence-request",
  );
  assert.equal(
    releaseEvidence.steps[4].value,
    "artifacts/release/release-evidence-request.md",
  );
  assert.equal(
    releaseEvidence.steps[5].value,
    "pnpm visual:references:request",
  );
  assert.equal(
    releaseEvidence.steps[6].value,
    "pnpm visual:references:handoff",
  );
  assert.equal(
    releaseEvidence.steps[7].value,
    "artifacts/visual/page-builder-reference-handoff",
  );
  assert.equal(
    releaseEvidence.steps[8].value,
    "artifacts/visual/page-builder-reference-handoff/README.md",
  );
  assert.equal(
    releaseEvidence.steps[9].value,
    "artifacts/visual/page-builder-reference-request.md",
  );
  assert.equal(
    releaseEvidence.steps[10].value,
    "artifacts/visual/page-builder-reference-export-table.tsv",
  );
  assert.equal(
    releaseEvidence.steps[11].value,
    "artifacts/visual/page-builder-reference-export-manifest.json",
  );
  assert.equal(releaseEvidence.steps[12].value, "pnpm smoke:request");
  assert.equal(
    releaseEvidence.steps[13].value,
    "artifacts/production-smoke/production-smoke-request.md",
  );
  assert.equal(
    releaseEvidence.steps[14].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.equal(
    releaseEvidence.steps[15].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv",
  );
  assert.equal(
    releaseEvidence.steps[16].value,
    "artifacts/production-smoke/production-smoke-dispatch-inputs.json",
  );
  assert.match(
    releaseEvidence.steps[17].value,
    /^pnpm release:handoff -- --require-ready /,
  );
});

function readStepValue(action, label) {
  return action.steps.find((step) => step.label === label)?.value;
}

function createLongProjectActionText() {
  return [
    "Run pnpm smoke:request, validate dispatch inputs, and run the Production Smoke workflow against the production environment.",
    "Keep production-smoke-report-<run_number>, release-preflight-<run_number>, release-evidence-check-<run_number>, and project-status-<run_number> artifacts.",
    "Verify with pnpm release:handoff -- --require-ready --project-status artifacts/release/project-status.json --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture --release-check artifacts/release/release-check.json.",
    "Only publish release notes after every linked artifact is retained and copied into the release handoff package.",
  ].join(" ");
}

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
