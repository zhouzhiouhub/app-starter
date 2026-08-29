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
});

test("project next actions structure the ready release notes handoff", () => {
  const [releaseNotesAction] = createProjectNextActions({
    releaseReady: true,
  });

  assert.equal(releaseNotesAction.area, "Release Notes");
  assert.equal(releaseNotesAction.label, "Generate release record");
  assert.deepEqual(
    releaseNotesAction.steps.map((step) => step.label),
    ["Command", "Input evidence", "Output", "Keep artifact", "Formal mode"],
  );
  assert.match(releaseNotesAction.steps[0].value, /pnpm release:notes --/);
  assert.match(
    releaseNotesAction.steps[0].value,
    /--project-status artifacts\/release\/project-status\.json/,
  );
  assert.equal(
    releaseNotesAction.steps[1].value,
    "artifacts/release/release-check.json, artifacts/release/project-status.json",
  );
  assert.equal(releaseNotesAction.steps[2].value, "docs/releases/<tag>.md");
  assert.equal(
    releaseNotesAction.steps[3].value,
    "release-notes-<run_number>",
  );
  assert.match(releaseNotesAction.steps[4].value, /without --allow-blocked/);
});
