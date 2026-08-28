import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runProjectStatusCli } from "../project-status.mjs";
import {
  createCompleteReleaseReport,
  createAcceptedVisualManifest,
  createPendingVisualManifest,
} from "../release/release-check-test-fixtures.mjs";
import {
  createProjectStatusArtifact,
  projectStatusSchemaVersion,
} from "./project-status.mjs";

test("project status summarizes blocked release evidence", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.schemaVersion, projectStatusSchemaVersion);
  assert.equal(artifact.status, "needs-evidence");
  assert.equal(artifact.releaseReady, false);
  assert.equal(artifact.releaseGate.smoke.status, "blocked");
  assert.equal(artifact.releaseGate.visual.status, "needs-evidence");
  assert.equal(artifact.releaseGate.visual.pendingTaskCount, 12);
  assert.equal(artifact.localVerification.commandCount, 6);
  assert.deepEqual(
    artifact.localVerification.commands.map((item) => item.command),
    [
      "pnpm install --frozen-lockfile",
      "pnpm run check:file-size",
      "pnpm typecheck",
      "pnpm lint",
      "pnpm test",
      "pnpm build",
    ],
  );
  assert.equal(artifact.nextActionCount, 13);
  assert.equal(artifact.nextActions[0].area, "Production Smoke");
  assert.equal(
    artifact.nextActions.some((action) => action.label === "hero-banner.desktop"),
    true,
  );
});

test("project status CLI prints readable blocked state", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "project-status-"));
  const stdout = [];

  try {
    const exitCode = await runProjectStatusCli([], {
      smokeRoots: [emptyArchiveRoot],
      stdout: (line) => stdout.push(line),
      visualManifest: createPendingVisualManifest(),
    });
    const text = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(text, /Project status \(project-status\.v1\)/);
    assert.match(text, /Status: needs-evidence/);
    assert.match(text, /Release ready: no/);
    assert.match(text, /Production Smoke: blocked/);
    assert.match(text, /Page Builder Visual: needs-evidence/);
    assert.match(text, /Local verification:/);
    assert.match(text, /TypeScript: pnpm typecheck \(configured\)/);
    assert.match(text, /hero-banner\.desktop/);
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
  }
});

test("project status CLI writes machine-readable status", async () => {
  const outputRoot = `tmp/project-status-output-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/project-status.json`;
  const stdout = [];
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runProjectStatusCli(
      ["--json", "--output", outputPath],
      {
        generatedAt: "2026-08-28T00:00:00.000Z",
        smokeArtifact: {
          path: "artifacts/production-smoke/smoke-report.json",
          report: createCompleteReleaseReport(),
        },
        stdout: (line) => stdout.push(line),
        visualEvidenceRoot: evidenceRoot,
        visualManifest: manifest,
      },
    );
    const artifact = JSON.parse(await readFile(outputPath, "utf8"));

    assert.equal(exitCode, 0);
    assert.equal(stdout.length, 1);
    assert.equal(JSON.parse(stdout[0]).status, "release-ready");
    assert.equal(artifact.releaseReady, true);
    assert.equal(artifact.nextActions[0].area, "Release Notes");
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("project status command is exposed in package and CI", async () => {
  const [packageJson, ciWorkflow] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
  ]);

  assert.match(
    packageJson,
    /"project:status": "node scripts\/project-status\.mjs"/,
  );
  assert.match(
    packageJson,
    /"test:project": "node --test scripts\/project\/\*\.test\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm project:status -- --help/);
});

function createBlockedCheck() {
  return {
    blockers: [
      {
        action: "Run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "Production smoke artifact missing",
      },
    ],
    releaseReady: false,
    smoke: {
      groups: [],
      path: null,
      releaseReady: false,
      summary: {
        status: "missing",
      },
    },
    visual: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      componentCount: 6,
      records: createVisualRecords(),
      status: "needs-evidence",
      viewportCount: 12,
    },
    visualChecklist: createVisualChecklist(),
  };
}

function createVisualRecords() {
  return mvpComponents.map((component) => ({
    accepted: false,
    component,
  }));
}

function createVisualChecklist() {
  const components = mvpComponents.map((component) => ({
    component,
    viewports: [
      createVisualTask(component, "desktop"),
      createVisualTask(component, "mobile"),
    ],
  }));

  return {
    components,
    pendingViewportCount: 12,
    readyViewportCount: 0,
    viewportCount: 12,
  };
}

const mvpComponents = [
  "hero-banner",
  "rich-text",
  "image-gallery",
  "cta-bar",
  "faq",
  "spec-table",
];

function createVisualTask(component, viewport) {
  return {
    commands: {
      importReference:
        "pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete",
      measure: "pnpm visual:measure -- --write --require-complete",
      verify: "pnpm visual:acceptance -- --require-accepted",
    },
    component,
    expectedDesignReference: `docs/visual/page-builder-references/${component}-${viewport}.png`,
    expectedPreviewScreenshot: `artifacts/visual/page-builder-visual-fixture-${component}-${viewport}.png`,
    ready: false,
    viewport,
  };
}
