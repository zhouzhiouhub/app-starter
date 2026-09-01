import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release checklist validates smoke inputs before workflow dispatch", async () => {
  const checklist = await readFile(
    "docs/development/release-checklist.md",
    "utf8",
  );
  const requestIndex = checklist.indexOf("Run `pnpm smoke:request`");
  const dispatchIndex = checklist.indexOf(
    "pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete",
  );
  const openWorkflowIndex = checklist.indexOf(
    "Open the `Production Smoke` workflow in GitHub Actions.",
  );
  const runWorkflowIndex = checklist.indexOf(
    "Run it against the `production` environment with the validated",
  );

  assert.notEqual(requestIndex, -1, "smoke request step is documented");
  assert.ok(dispatchIndex > requestIndex, "dispatch validation follows request");
  assert.ok(openWorkflowIndex > dispatchIndex, "workflow opens after validation");
  assert.ok(runWorkflowIndex > openWorkflowIndex, "workflow run follows opening");
});
