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

test("release check CLI help explains visual artifact input", async () => {
  const stdout = [];
  const exitCode = await runReleaseCheckCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(help, /--all-visual-tasks/);
  assert.match(help, /--markdown-output <path>/);
  assert.match(help, /--visual-artifact-dir <dir>/);
  assert.match(help, /downloaded Page Builder Visual artifact/);
});

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
  assert.equal(artifact.visual.status, "needs-evidence");
  assert.equal(artifact.readinessChecklist.releaseReady, false);
  assert.equal(artifact.readinessChecklist.itemCount, 3);
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
    assert.equal(artifact.readinessChecklist.items.length, 3);
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

test("release check CLI writes Markdown output", async () => {
  const emptyArchiveRoot = mkdtempSync(
    path.join(tmpdir(), "release-markdown-"),
  );
  const outputRoot = `tmp/release-check-markdown-cli-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/release-check.md`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runReleaseCheckCli(
      ["--markdown-output", outputPath],
      {
        smokeRoots: [emptyArchiveRoot],
        stdout: (line) => stdout.push(line),
        visualManifest: createPendingVisualManifest(),
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 1);
    assert.match(markdown, /^# Release Evidence Check/m);
    assert.match(markdown, /Release ready: no/);
    assert.match(markdown, /Production Smoke report: blocked/);
    assert.match(markdown, /hero-banner\.desktop/);
    assert.equal(
      stdout.some((line) =>
        line.includes(`Release evidence Markdown written: ${outputPath}`),
      ),
      true,
    );
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("release check CLI prints readiness checklist in text mode only", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "release-list-"));
  const stdout = [];
  const exitCode = await runReleaseCheckCli(["--checklist"], {
    smokeRoots: [emptyArchiveRoot],
    stdout: (line) => stdout.push(line),
    visualManifest: createPendingVisualManifest(),
  });

  assert.equal(exitCode, 1);
  assert.equal(
    stdout.some((line) => line.includes("Release readiness checklist:")),
    true,
  );
  assert.equal(
    stdout.some((line) => line.includes("Production Smoke report: blocked")),
    true,
  );
  assert.equal(
    stdout.some((line) =>
      line.includes("Page Builder Visual evidence: needs-evidence"),
    ),
    true,
  );

  const jsonStdout = [];
  await runReleaseCheckCli(["--json", "--checklist"], {
    smokeRoots: [emptyArchiveRoot],
    stdout: (line) => jsonStdout.push(line),
    visualManifest: createPendingVisualManifest(),
  });

  assert.equal(jsonStdout.length, 1);
  assert.doesNotMatch(jsonStdout[0], /Release readiness checklist/);
});

test("release check CLI can print every visual checklist task", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "release-full-list-"));
  const stdout = [];
  const endMarker = "full-visual-task-command.json";
  const visualManifestPath = [
    "reports/visual",
    "very-long-page-builder-visual-artifact-directory-name".repeat(8),
    endMarker,
  ].join("/");
  const exitCode = await runReleaseCheckCli(
    [
      "--checklist",
      "--all-visual-tasks",
      "--visual-manifest",
      visualManifestPath,
    ],
    {
      smokeRoots: [emptyArchiveRoot],
      stdout: (line) => stdout.push(line),
      visualManifest: createPendingVisualManifest(),
    },
  );
  const output = stdout.join("\n");

  assert.equal(exitCode, 1);
  assert.match(output, /spec-table\.mobile/);
  assert.equal(output.includes(endMarker), true);
  assert.doesNotMatch(output, /\.\.\. and \d+ more visual viewport tasks/);
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
