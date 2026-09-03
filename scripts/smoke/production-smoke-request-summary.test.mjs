import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { runProductionSmokeRequestCli } from "./production-smoke-request.mjs";

test("production smoke request CLI prints first missing input reason", async () => {
  const root = `tmp/production-smoke-request-missing-${process.pid}-${Date.now()}`;
  const outputPath = `${root}/request.md`;
  const stdout = [];

  try {
    const exitCode = await runProductionSmokeRequestCli(
      ["--output", outputPath],
      { stdout: (line) => stdout.push(line) },
    );
    const text = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(text, /Ready to dispatch: no/);
    assert.match(
      text,
      /Missing inputs: visual_artifact_name, visual_artifact_run_id/,
    );
    assert.match(
      text,
      /First missing input: visual_artifact_name - replace placeholder page-builder-visual-fixture-<run_number> with Page Builder Visual workflow artifact after visual evidence passes/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
