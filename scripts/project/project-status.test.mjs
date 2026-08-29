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
  assertProjectStatusArtifact,
  createProjectStatusArtifact,
  formatProjectStatusArtifact,
  projectStatusSchemaVersion,
  readProjectStatusCliConfig,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status summarizes blocked release evidence", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.schemaVersion, projectStatusSchemaVersion);
  assert.equal(artifact.status, "needs-evidence");
  assert.equal(artifact.releaseReady, false);
  assert.equal(
    artifact.completedMilestones.includes(
      "Production deployment, environment variable matrix, and rollback runbook are documented for the MVP release path.",
    ),
    true,
  );
  assert.equal(artifact.releaseGate.smoke.status, "blocked");
  assert.equal(artifact.releaseGate.visual.status, "needs-evidence");
  assert.equal(artifact.releaseGate.visual.pendingTaskCount, 12);
  assert.equal(artifact.localVerification.commandCount, 6);
  assert.equal(artifact.nextActionLimit, 8);
  assert.equal(artifact.truncatedNextActionCount, 6);
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
  assert.equal(artifact.nextActionCount, 14);
  assert.equal(artifact.nextActions.length, 8);
  assert.equal(artifact.nextActions[0].area, "Production Smoke");
  assert.deepEqual(
    artifact.nextActions[0].steps.map((step) => step.label),
    ["Run workflow", "Keep artifacts", "Rerun gate"],
  );
  assert.equal(
    artifact.nextActions[0].steps[1].value,
    "production-smoke-report-<run_number>, release-preflight-<run_number>, release-evidence-check-<run_number>, project-status-<run_number>",
  );
  assert.equal(
    artifact.nextActions.some((action) =>
      action.action.includes("pnpm visual:artifact-bundle"),
    ),
    true,
  );
  assert.equal(
    artifact.nextActions.some((action) => action.label === "hero-banner.desktop"),
    true,
  );
  const heroDesktopAction = artifact.nextActions.find(
    (action) => action.label === "hero-banner.desktop",
  );
  assert.deepEqual(
    heroDesktopAction.steps.map((step) => step.label),
    [
      "Reference",
      "Preview",
      "Capture",
      "Reference report",
      "Import",
      "Measure",
      "Accept passing",
      "Verify",
    ],
  );
  assert.equal(
    artifact.nextActions.some((action) =>
      action.action.includes("visual-reference-import-report.md"),
    ),
    true,
  );
});

test("project status can serialize every next action", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
    includeAllActions: true,
  });

  assert.equal(artifact.nextActionCount, 14);
  assert.equal(artifact.nextActions.length, 14);
  assert.equal(artifact.truncatedNextActionCount, 0);
  assert.equal(artifact.nextActions.at(-1).label, "spec-table.mobile");
  assert.equal(artifact.nextActions.at(-1).steps.at(-1).label, "Verify");
});

test("project status validates structured next action steps", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });
  const visualAction = artifact.nextActions.find(
    (action) => action.label === "hero-banner.desktop",
  );

  visualAction.steps = [{ label: "Reference" }];

  assert.throws(
    () => assertProjectStatusArtifact(artifact),
    /nextActions\.steps\.value/,
  );
});

test("project status config keeps all-actions local", () => {
  const config = readProjectStatusCliConfig([
    "--",
    "--all-actions",
    "--json",
    "--markdown-output",
    "artifacts/release/project-status.md",
    "--require-ready",
  ]);

  assert.equal(config.allActions, true);
  assert.equal(config.json, true);
  assert.equal(
    config.markdownOutputPath,
    "artifacts/release/project-status.md",
  );
  assert.equal(config.requireReady, true);
  assert.equal(
    readProjectStatusCliConfig([
      "--visual-artifact-dir",
      String.raw`reports\\visual\\page-builder-fixture`,
    ]).releaseCheckConfig.visualArtifactDir,
    "reports/visual/page-builder-fixture",
  );
  assert.throws(
    () => readProjectStatusCliConfig(["--markdown-output", "README.md"]),
    /Project status Markdown must use safe path segments/,
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
    assert.match(
      text,
      /Run workflow: GitHub Actions Production Smoke against the production environment/,
    );
    assert.match(text, /Keep artifacts: production-smoke-report-<run_number>/);
    assert.match(
      text,
      /Rerun gate: pnpm release:check -- --smoke-report <path>/,
    );
    assert.match(text, /Page Builder Visual: needs-evidence/);
    assert.match(text, /Local verification:/);
    assert.match(text, /TypeScript: pnpm typecheck \(configured\)/);
    assert.match(text, /hero-banner\.desktop/);
    assert.match(text, /Use --all-actions to list every next action/);
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
  }
});

test("project status CLI can print every next action", async () => {
  const emptyArchiveRoot = mkdtempSync(
    path.join(tmpdir(), "project-status-all-actions-"),
  );
  const stdout = [];

  try {
    const exitCode = await runProjectStatusCli(["--all-actions"], {
      smokeRoots: [emptyArchiveRoot],
      stdout: (line) => stdout.push(line),
      visualManifest: createPendingVisualManifest(),
    });
    const text = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(text, /spec-table\.mobile/);
    assert.match(
      text,
      /spec-table\.mobile[\s\S]*Capture: pnpm visual:capture:fixture -- --component spec-table --viewport mobile/,
    );
    assert.match(
      text,
      /spec-table\.mobile[\s\S]*Accept passing: pnpm visual:measure -- --write --accept-passing --require-complete/,
    );
    assert.match(
      text,
      /spec-table\.mobile[\s\S]*Verify: pnpm visual:acceptance -- --require-accepted/,
    );
    assert.doesNotMatch(text, /pnpm visua\.\.\./);
    assert.doesNotMatch(text, /\.\.\. and \d+ more next actions/);
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
  }
});

test("project status formatter can preserve full action lines", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
    includeAllActions: true,
  });
  const endMarker = "final-full-action-marker";
  const longAction = [
    "Run",
    "pnpm visual:measure -- --write --require-complete ".repeat(12),
    endMarker,
  ].join(" ");

  artifact.nextActions = [
    {
      action: longAction,
      area: "Page Builder Visual",
      label: "spec-table.mobile",
    },
  ];
  artifact.nextActionCount = 1;
  artifact.nextActionLimit = 1;
  artifact.truncatedNextActionCount = 0;

  const truncatedText = formatProjectStatusArtifact(artifact).join("\n");
  const fullText = formatProjectStatusArtifact(artifact, {
    truncateLines: false,
  }).join("\n");

  assert.equal(truncatedText.includes(endMarker), false);
  assert.equal(fullText.includes(endMarker), true);
});

test("project status CLI can require release-ready evidence", async () => {
  const emptyArchiveRoot = mkdtempSync(
    path.join(tmpdir(), "project-status-ready-gate-"),
  );
  const blockedStdout = [];

  try {
    const blockedExitCode = await runProjectStatusCli(["--require-ready"], {
      smokeRoots: [emptyArchiveRoot],
      stdout: (line) => blockedStdout.push(line),
      visualManifest: createPendingVisualManifest(),
    });

    assert.equal(blockedExitCode, 1);
    assert.match(blockedStdout.join("\n"), /Status: needs-evidence/);
  } finally {
    await rm(emptyArchiveRoot, { force: true, recursive: true });
  }

  const readyStdout = [];
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const readyExitCode = await runProjectStatusCli(["--require-ready"], {
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    stdout: (line) => readyStdout.push(line),
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
  });

  assert.equal(readyExitCode, 0);
  assert.match(readyStdout.join("\n"), /Status: release-ready/);
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
  const [packageJson, ciWorkflow, readme, setupDoc] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
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
  assert.match(ciWorkflow, /pnpm project:status -- --all-actions --json/);
  assert.match(
    ciWorkflow,
    /pnpm project:status -- --all-actions --markdown-output tmp\/project-status-handoff\.md/,
  );
  assert.match(readme, /pnpm project:status -- --all-actions/);
  assert.match(
    readme,
    /pnpm project:status -- --markdown-output artifacts\/release\/project-status\.md/,
  );
  assert.match(
    readme,
    /pnpm project:status -- --output artifacts\/release\/project-status\.json/,
  );
  assert.match(setupDoc, /pnpm project:status -- --all-actions/);
  assert.match(
    setupDoc,
    /pnpm project:status -- --markdown-output artifacts\/release\/project-status\.md/,
  );
  assert.match(
    setupDoc,
    /pnpm project:status -- --output artifacts\/release\/project-status\.json/,
  );
});
