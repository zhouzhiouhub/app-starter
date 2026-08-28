import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createPageBuilderVisualAcceptanceChecklist,
  formatPageBuilderVisualAcceptanceChecklist,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  readPageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";

test("visual acceptance checklist lists missing release evidence", async () => {
  const manifest = await readPageBuilderVisualAcceptanceManifest();
  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest);
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist);

  assert.equal(checklist.viewportCount, 12);
  assert.equal(checklist.readyViewportCount, 0);
  assert.equal(checklist.pendingViewportCount, 12);
  assert.match(lines.join("\n"), /Evidence checklist:/);
  assert.match(
    lines.join("\n"),
    /hero-banner\.desktop: missing designReference, visualMatchPercent >= 95, maxLayoutDeltaPx <= 5, maxColorDeltaE <= 3, status=accepted/,
  );
  assert.match(lines.join("\n"), /Next: attach missing design references/);
});

test("visual acceptance checklist marks passing evidence ready", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest, {
    evidenceRoot,
  });
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist);

  assert.equal(checklist.readyViewportCount, 12);
  assert.equal(checklist.pendingViewportCount, 0);
  assert.match(lines.join("\n"), /hero-banner\.desktop: ready/);
  assert.doesNotMatch(lines.join("\n"), /Next: attach missing/);
});

test("visual acceptance checklist calls out failing metrics", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  manifest.records[0].viewports.desktop.visualMatchPercent = 94;
  manifest.records[0].viewports.desktop.maxLayoutDeltaPx = 8;
  manifest.records[0].viewports.desktop.maxColorDeltaE = 3.5;

  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest, {
    evidenceRoot,
  });
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist);

  assert.equal(checklist.readyViewportCount, 11);
  assert.match(lines.join("\n"), /visualMatchPercent >= 95 \(current 94\)/);
  assert.match(lines.join("\n"), /maxLayoutDeltaPx <= 5 \(current 8\)/);
  assert.match(lines.join("\n"), /maxColorDeltaE <= 3 \(current 3.5\)/);
});

test("visual acceptance checklist calls out invalid evidence paths", () => {
  const { evidenceRoot, manifest } = createAcceptedManifestWithEvidenceFiles();
  manifest.records[0].viewports.desktop.designReference =
    "https://figma.example.com/file.png";
  manifest.records[0].viewports.mobile.previewScreenshot =
    "artifacts/visual/missing-preview.png";
  writeFileSync(
    path.join(
      evidenceRoot,
      manifest.records[1].viewports.desktop.designReference,
    ),
    "",
  );

  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest, {
    evidenceRoot,
  });
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist).join("\n");

  assert.equal(checklist.readyViewportCount, 9);
  assert.match(lines, /designReference safe retained image path/);
  assert.match(lines, /previewScreenshot retained image file exists/);
  assert.match(lines, /designReference non-empty image file/);
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
    path.join(tmpdir(), "page-builder-visual-checklist-"),
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
