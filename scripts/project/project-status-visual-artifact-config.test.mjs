import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runProjectStatusCli } from "../project-status.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check-config.mjs";
import { writeVisualArtifact } from "../visual/page-builder-visual-artifact-check-test-fixtures.mjs";
import { applyProjectStatusVisualArtifactDiscovery } from "./project-status-visual-artifact-config.mjs";

test("project status discovers a complete default visual artifact", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "project-status-visual-"));
  const smokeRoot = path.join(root, "smoke");
  const originalCwd = process.cwd();
  const stdout = [];

  mkdirSync(smokeRoot);

  try {
    process.chdir(root);
    mkdirSync(defaultPageBuilderVisualArtifactDir, { recursive: true });
    writeVisualArtifact(defaultPageBuilderVisualArtifactDir);

    const exitCode = await runProjectStatusCli(["--json"], {
      smokeRoots: [smokeRoot],
      stdout: (line) => stdout.push(line),
    });
    const artifact = JSON.parse(stdout[0]);

    assert.equal(exitCode, 0);
    assert.equal(artifact.releaseGate.visual.artifactStatus, "complete");
    assert.equal(
      artifact.releaseGate.visual.pendingTaskCount,
      12,
    );
    assert.match(
      artifact.nextActions[0].steps.at(-1).value,
      /--visual-artifact-dir reports\/visual\/page-builder-fixture/,
    );
  } finally {
    process.chdir(originalCwd);
    await rm(root, { force: true, recursive: true });
  }
});

test("project status keeps injected visual evidence config", () => {
  const config = {
    visualArtifactDir: null,
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  };

  assert.equal(
    applyProjectStatusVisualArtifactDiscovery(config, {
      visualManifest: { records: [] },
    }),
    config,
  );
});

test("project status keeps explicit visual manifest config", () => {
  const config = {
    visualArtifactDir: null,
    visualManifestPath: "docs/development/custom-visual-manifest.json",
  };

  assert.equal(
    applyProjectStatusVisualArtifactDiscovery(config),
    config,
  );
});
