import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { runPageBuilderVisualAcceptanceCli } from "../page-builder-visual-acceptance.mjs";
import {
  defaultPageBuilderVisualAcceptanceManifestPath,
  formatPageBuilderVisualAcceptanceReport,
  mvpPageBuilderComponents,
  normalizeVisualAcceptanceOutputPath,
  pageBuilderVisualAcceptanceSchemaVersion,
  readPageBuilderVisualAcceptanceCliConfig,
  readPageBuilderVisualAcceptanceManifest,
  validatePageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";

test("visual acceptance manifest covers every MVP core section", async () => {
  const manifest = await readPageBuilderVisualAcceptanceManifest();
  const report = validatePageBuilderVisualAcceptanceManifest(manifest);

  assert.equal(report.status, "needs-evidence");
  assert.equal(report.componentCount, 6);
  assert.equal(report.viewportCount, 12);
  assert.equal(report.acceptedComponentCount, 0);
  assert.equal(report.acceptedViewportCount, 0);
  assert.equal(report.errorCount, 0);
  assert.equal(report.warningCount, 6);
  assert.deepEqual(
    report.records.map((record) => record.component),
    mvpPageBuilderComponents,
  );
  assert.deepEqual(report.records[0].viewports, [
    { accepted: false, status: "needs-evidence", viewport: "desktop" },
    { accepted: false, status: "needs-evidence", viewport: "mobile" },
  ]);
});

test("visual acceptance require accepted mode blocks pending records", async () => {
  const manifest = await readPageBuilderVisualAcceptanceManifest();
  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    requireAccepted: true,
  });

  assert.equal(report.status, "invalid");
  assert.equal(report.errorCount, 6);
  assert.match(report.issues[0].message, /hero-banner is needs-evidence/);
});

test("visual acceptance accepts signed off component evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  const report = validatePageBuilderVisualAcceptanceManifest(
    manifest,
    { evidenceRoot, requireAccepted: true },
  );

  assert.equal(report.status, "accepted");
  assert.equal(report.errorCount, 0);
  assert.equal(report.warningCount, 0);
  assert.equal(report.acceptedComponentCount, 6);
  assert.equal(report.acceptedViewportCount, 12);
});

test("visual acceptance rejects accepted records with weak evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  manifest.records[0].viewports.desktop.previewScreenshot = "";
  manifest.records[0].viewports.desktop.visualMatchPercent = 94;
  manifest.records[1].viewports.mobile.maxLayoutDeltaPx = 8;
  manifest.records[2].viewports.mobile.maxColorDeltaE = 3.5;

  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot,
    requireAccepted: true,
  });

  assert.equal(report.status, "invalid");
  assert.equal(report.errorCount, 7);
  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    [
      "missing_evidence_path",
      "evidence_threshold_failed",
      "record_viewports_not_accepted",
      "evidence_threshold_failed",
      "record_viewports_not_accepted",
      "evidence_threshold_failed",
      "record_viewports_not_accepted",
    ],
  );
});

test("visual acceptance rejects unsafe evidence paths", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  manifest.records[0].viewports.desktop.designReference =
    "https://figma.example.com/file";
  manifest.records[0].viewports.mobile.previewScreenshot =
    "../artifacts/visual/hero-mobile.png";
  manifest.records[1].viewports.desktop.previewScreenshot =
    "tmp/visual/rich-text-desktop.png";
  manifest.records[1].viewports.mobile.designReference =
    "docs/design/rich-text-mobile.svg";

  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot,
    requireAccepted: true,
  });

  assert.equal(report.status, "invalid");
  assert.equal(report.errorCount, 6);
  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    [
      "invalid_evidence_path",
      "invalid_evidence_path",
      "record_viewports_not_accepted",
      "invalid_evidence_path",
      "invalid_evidence_path",
      "record_viewports_not_accepted",
    ],
  );
  assert.match(
    report.issues[0].message,
    /hero-banner\.desktop\.designReference must be a retained relative image path/,
  );
});

test("visual acceptance rejects accepted paths without retained files", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  manifest.records[0].viewports.desktop.previewScreenshot =
    "artifacts/visual/missing-preview.png";
  writeFileSync(
    path.join(evidenceRoot, manifest.records[1].viewports.mobile.designReference),
    "",
  );

  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot,
    requireAccepted: true,
  });

  assert.equal(report.status, "invalid");
  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    [
      "missing_evidence_file",
      "record_viewports_not_accepted",
      "invalid_evidence_file",
      "record_viewports_not_accepted",
    ],
  );
});

test("visual acceptance validates provided pending evidence paths", () => {
  const { evidenceRoot, manifest } =
    createPendingManifestWithProvidedScreenshotFiles();
  let report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot,
  });

  assert.equal(report.status, "needs-evidence");
  assert.equal(report.errorCount, 0);
  assert.equal(report.warningCount, 6);

  manifest.records[0].viewports.desktop.previewScreenshot =
    "artifacts/visual/missing-preview.png";
  report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot,
  });

  assert.equal(report.status, "invalid");
  assert.equal(report.errorCount, 1);
  assert.equal(report.warningCount, 6);
  assert.equal(report.issues[0].code, "missing_evidence_file");
});

test("visual acceptance rejects missing and duplicate section records", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  manifest.records = [
    manifest.records[0],
    manifest.records[0],
    ...manifest.records.slice(2),
    {
      component: "product-card",
      status: "accepted",
      viewports: {},
    },
  ];

  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot,
  });

  assert.equal(report.status, "invalid");
  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    ["duplicate_component", "unknown_component", "missing_component"],
  );
});

test("visual acceptance CLI config parses options and paths", () => {
  assert.deepEqual(readPageBuilderVisualAcceptanceCliConfig([]), {
    checklist: false,
    json: false,
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    outputPath: null,
    requireAccepted: false,
  });
  assert.deepEqual(
    readPageBuilderVisualAcceptanceCliConfig([
      "--",
      "--checklist",
      "--json",
      "--output",
      "reports/visual/page-builder-fixture/visual-acceptance-report.json",
      "--require-accepted",
      "docs/custom-visual.json",
    ]),
    {
      checklist: true,
      json: true,
      manifestPath: "docs/custom-visual.json",
      outputPath:
        "reports/visual/page-builder-fixture/visual-acceptance-report.json",
      requireAccepted: true,
    },
  );
  assert.equal(
    normalizeVisualAcceptanceOutputPath(
      "reports\\visual\\page-builder-fixture\\visual-acceptance-report.json",
    ),
    "reports/visual/page-builder-fixture/visual-acceptance-report.json",
  );
  assert.throws(
    () => readPageBuilderVisualAcceptanceCliConfig(["--bad-option"]),
    /Unknown visual acceptance option/,
  );
  assert.throws(
    () => readPageBuilderVisualAcceptanceCliConfig(["--output", "README.md"]),
    /Visual acceptance output must be under/,
  );
});

test("visual acceptance report formats pending evidence", async () => {
  const manifest = await readPageBuilderVisualAcceptanceManifest();
  const report = validatePageBuilderVisualAcceptanceManifest(manifest);
  const lines = formatPageBuilderVisualAcceptanceReport(report);

  assert.match(lines.join("\n"), /Status: needs-evidence/);
  assert.match(lines.join("\n"), /Components accepted: 0\/6/);
  assert.match(lines.join("\n"), /Pending components: hero-banner/);
});

test("visual acceptance CLI prints machine-readable JSON", async () => {
  const { evidenceRoot, manifest } =
    createPendingManifestWithProvidedScreenshotFiles();
  const stdout = [];
  const exitCode = await runPageBuilderVisualAcceptanceCli(
    ["--json", "--checklist"],
    {
      evidenceRoot,
      manifest,
      stdout: (line) => stdout.push(line),
    },
  );

  assert.equal(exitCode, 0);
  assert.equal(stdout.length, 1);

  const artifact = JSON.parse(stdout[0]);
  assert.equal(artifact.schemaVersion, pageBuilderVisualAcceptanceSchemaVersion);
  assert.equal(artifact.status, "needs-evidence");
  assert.equal(artifact.checklist.pendingViewportCount, 12);
});

test("visual acceptance CLI writes JSON artifact output", async () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  const outputRoot = `tmp/page-builder-visual-acceptance-${process.pid}-${Date.now()}`;
  const outputPath = `${outputRoot}/visual-acceptance-report.json`;
  const stdout = [];

  await rm(outputRoot, { force: true, recursive: true });

  try {
    const exitCode = await runPageBuilderVisualAcceptanceCli(
      ["--output", outputPath],
      {
        evidenceRoot,
        manifest,
        stdout: (line) => stdout.push(line),
      },
    );
    const artifact = JSON.parse(await readFile(outputPath, "utf8"));

    assert.equal(exitCode, 0);
    assert.equal(artifact.status, "accepted");
    assert.equal(
      stdout.some((line) =>
        line.includes(`Visual acceptance artifact written: ${outputPath}`),
      ),
      true,
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

function createAcceptedManifest() {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "accepted",
      viewports: {
        desktop: createAcceptedViewportEvidence(component, "desktop"),
        mobile: createAcceptedViewportEvidence(component, "mobile"),
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

function createAcceptedManifestWithEvidenceFiles() {
  const manifest = createAcceptedManifest();
  const evidenceRoot = mkdtempSync(
    path.join(tmpdir(), "page-builder-visual-acceptance-"),
  );

  for (const record of manifest.records) {
    for (const viewport of ["desktop", "mobile"]) {
      const evidence = record.viewports[viewport];
      writeFixtureImage(evidenceRoot, evidence.designReference);
      writeFixtureImage(evidenceRoot, evidence.previewScreenshot);
    }
  }

  return { evidenceRoot, manifest };
}

function createPendingManifestWithProvidedScreenshotFiles() {
  const manifest = createAcceptedManifest();
  const evidenceRoot = mkdtempSync(
    path.join(tmpdir(), "page-builder-visual-acceptance-pending-"),
  );

  for (const record of manifest.records) {
    record.status = "needs-evidence";

    for (const viewport of ["desktop", "mobile"]) {
      const evidence = record.viewports[viewport];
      evidence.designReference = null;
      evidence.maxColorDeltaE = null;
      evidence.maxLayoutDeltaPx = null;
      evidence.status = "needs-evidence";
      evidence.visualMatchPercent = null;
      writeFixtureImage(evidenceRoot, evidence.previewScreenshot);
    }
  }

  return { evidenceRoot, manifest };
}

function createAcceptedViewportEvidence(component, viewport) {
  return {
    designReference: `docs/design/${component}-${viewport}.png`,
    maxColorDeltaE: 2.5,
    maxLayoutDeltaPx: 4,
    previewScreenshot: `artifacts/visual/${component}-${viewport}.png`,
    status: "accepted",
    visualMatchPercent: 96,
  };
}

function writeFixtureImage(root, relativePath) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
}
