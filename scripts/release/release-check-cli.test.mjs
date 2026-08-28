import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runReleaseCheckCli } from "../release-check.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
} from "../visual/page-builder-visual-acceptance.mjs";

test("release check CLI prints machine-readable JSON", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "release-json-"));
  const stdout = [];
  const exitCode = await runReleaseCheckCli(["--json"], {
    smokeRoots: [emptyArchiveRoot],
    stdout: (line) => stdout.push(line),
    visualManifest: createPendingVisualManifest(),
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.length, 1);
  assert.doesNotMatch(stdout[0], /Release evidence gate/);

  const artifact = JSON.parse(stdout[0]);
  assert.equal(artifact.schemaVersion, "release-evidence-check.v1");
  assert.equal(artifact.status, "blocked");
  assert.equal(artifact.smoke.status, "blocked");
  assert.equal(artifact.visual.status, "invalid");
});

test("release check CLI writes JSON artifact output", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "release-output-"));
  const outputRoot = `tmp/release-check-output-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/release-check.json`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runReleaseCheckCli(["--output", outputPath], {
      smokeRoots: [emptyArchiveRoot],
      stdout: (line) => stdout.push(line),
      visualManifest: createPendingVisualManifest(),
    });
    const artifact = JSON.parse(await readFile(outputPath, "utf8"));

    assert.equal(exitCode, 1);
    assert.equal(artifact.schemaVersion, "release-evidence-check.v1");
    assert.equal(artifact.status, "blocked");
    assert.equal(
      stdout.some((line) =>
        line.includes(`Release evidence artifact written: ${outputPath}`),
      ),
      true,
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

function createPendingVisualManifest() {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: {
        desktop: createPendingViewportEvidence(),
        mobile: createPendingViewportEvidence(),
      },
    })),
    schemaVersion: pageBuilderVisualAcceptanceSchemaVersion,
    targets: {
      components: mvpPageBuilderComponents,
      maxColorDeltaE: 3,
      maxLayoutDeltaPx: 5,
      minVisualMatchPercent: 95,
      viewports: ["desktop", "mobile"],
    },
  };
}

function createPendingViewportEvidence() {
  return {
    designReference: null,
    maxColorDeltaE: null,
    maxLayoutDeltaPx: null,
    previewScreenshot: null,
    status: "needs-evidence",
    visualMatchPercent: null,
  };
}
