import assert from "node:assert/strict";
import test from "node:test";
import { createVisualEvidenceAction } from "./release-check-visual-actions.mjs";

test("visual evidence action starts with fixture bundle before artifact completion", () => {
  const action = createVisualEvidenceAction(null);

  assert.match(action, /pnpm visual:artifact-bundle/);
  assert.match(action, /pnpm visual:acceptance -- --checklist/);
  assert.match(action, /pnpm visual:measure -- --write --accept-passing --require-complete/);
});

test("visual evidence action uses artifact-local manifest after artifact completion", () => {
  const action = createVisualEvidenceAction({
    artifactDir: "reports/visual/page-builder-fixture",
    status: "complete",
  });

  assert.match(action, /Fixture artifact is complete/);
  assert.doesNotMatch(action, /pnpm visual:artifact-bundle/);
  assert.match(
    action,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
  assert.match(action, /pnpm visual:capture:fixture/);
  assert.match(action, /visual-capture-report\.json/);
  assert.match(action, /pnpm visual:measure/);
  assert.match(action, /--accept-passing --require-complete/);
  assert.match(action, /pnpm visual:acceptance -- --require-accepted/);
});
