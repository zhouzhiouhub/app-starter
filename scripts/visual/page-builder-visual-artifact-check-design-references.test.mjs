import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { checkPageBuilderVisualArtifact } from "./page-builder-visual-artifact-check.mjs";
import {
  corruptPngBytes,
  createArtifactDir,
  createTestPng,
  hasIssue,
  writeVisualArtifact,
} from "./page-builder-visual-artifact-check-test-fixtures.mjs";

test("visual artifact check accepts readable design reference PNGs", () => {
  const artifactDir = createArtifactDir("design-reference-complete");

  try {
    writeVisualArtifact(artifactDir);
    const referencePath = writeDesignReference(artifactDir, createTestPng(16, 12));
    updateHeroDesktopDesignReference(artifactDir, referencePath);

    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "complete");
    assert.equal(report.presentDesignReferenceCount, 1);
    assert.equal(report.referencedDesignReferenceCount, 1);
    assert.equal(hasIssue(report, "invalid_design_reference_file"), false);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects corrupt design reference PNGs", () => {
  const artifactDir = createArtifactDir("design-reference-corrupt");

  try {
    writeVisualArtifact(artifactDir);
    const referencePath = writeDesignReference(artifactDir, corruptPngBytes);
    updateHeroDesktopDesignReference(artifactDir, referencePath);

    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "invalid");
    assert.equal(report.presentDesignReferenceCount, 0);
    assert.equal(report.referencedDesignReferenceCount, 1);
    assert.equal(hasIssue(report, "invalid_design_reference_file"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

function writeDesignReference(artifactDir, body) {
  const referencePath = `${artifactDir}/references/hero-banner-desktop.png`;

  mkdirSync(path.dirname(referencePath), { recursive: true });
  writeFileSync(referencePath, body);
  return referencePath;
}

function updateHeroDesktopDesignReference(artifactDir, referencePath) {
  const manifestPath = `${artifactDir}/page-builder-visual-acceptance.json`;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const hero = manifest.records.find((record) => record.component === "hero-banner");

  hero.viewports.desktop.designReference = referencePath;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
