import assert from "node:assert/strict";
import test from "node:test";
import { createMissingSmokeArtifactAction } from "./release-check-smoke-actions.mjs";

test("missing smoke artifact action starts with request and dispatch validation", () => {
  const action = createMissingSmokeArtifactAction(
    new Error("No smoke reports found."),
  );

  assert.match(
    action,
    /^Run pnpm smoke:request, validate the filled workflow_dispatch inputs with pnpm smoke:dispatch -- --inputs-json artifacts\/production-smoke\/production-smoke-dispatch-inputs\.json --require-complete, then run the Production Smoke workflow/u,
  );
  assert.match(action, /production-smoke-report-<run_number>/u);
  assert.match(action, /release-preflight-<run_number>/u);
  assert.match(action, /release-evidence-check-<run_number>/u);
  assert.match(action, /project-status-<run_number>/u);
  assert.match(action, /pass --smoke-report <path>/u);
});

test("missing smoke artifact action keeps explicit report path visible", () => {
  const action = createMissingSmokeArtifactAction(
    new Error("No smoke reports found."),
    "artifacts/production-smoke/smoke-report.json",
  );

  assert.match(
    action,
    /place its smoke-report\.json at artifacts\/production-smoke\/smoke-report\.json/u,
  );
  assert.match(
    action,
    /pnpm release:check -- --smoke-report artifacts\/production-smoke\/smoke-report\.json/u,
  );
});
