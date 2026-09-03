import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createProjectStatusArtifact,
  createProjectStatusMarkdown,
  formatProjectStatusArtifact,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status summarizes visual artifact counts", () => {
  const check = createBlockedCheck();
  check.visualArtifact = {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    presentDesignReferenceCount: 12,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    referenceImport: {
      complete: true,
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      missingCount: 0,
      missingReferences: [],
      requiredReferenceCount: 12,
      requiredReferenceEntryCount: 12,
      requiredReferenceStatusCounts: {
        invalid: 0,
        missing: 0,
        ready: 12,
        updated: 0,
        wouldUpdate: 0,
      },
      sourceDir: "docs/visual/page-builder-references",
      sourceDirStatus: "ready",
      status: "ready",
      updated: false,
      updateCount: 0,
    },
    referencedDesignReferenceCount: 12,
    requiredFileCount: 6,
    status: "complete",
  };
  const artifact = createProjectStatusArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });
  const terminalText = formatProjectStatusArtifact(artifact).join("\n");
  const markdown = createProjectStatusMarkdown(artifact);

  assert.deepEqual(artifact.releaseGate.visual.artifactCheck, {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    presentDesignReferenceCount: 12,
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    referenceImport: {
      complete: true,
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      missingCount: 0,
      missingReferences: [],
      requiredReferenceCount: 12,
      requiredReferenceEntryCount: 12,
      requiredReferenceStatusCounts: {
        invalid: 0,
        missing: 0,
        ready: 12,
        updated: 0,
        wouldUpdate: 0,
      },
      sourceDir: "docs/visual/page-builder-references",
      sourceDirStatus: "ready",
      status: "ready",
      updated: false,
      updateCount: 0,
    },
    referencedDesignReferenceCount: 12,
    requiredFileCount: 6,
    status: "complete",
  });
  assert.match(
    terminalText,
    /Page Builder Visual: needs-evidence, components 0\/6, viewports 0\/12, pending tasks 12, artifact complete \(reports\/visual\/page-builder-fixture, 0 issues, 6\/6 files, 12\/12 screenshots, 12\/12 manifest-linked design references, references ready \(ready source, 0 missing, 0 updates, 12\/12 required source references available\)\)/,
  );
  assert.match(
    markdown,
    /Page Builder Visual: needs-evidence, 0\/6 components, 0\/12 viewports, 12 pending tasks, artifact complete \(reports\/visual\/page-builder-fixture, 0 issues, 6\/6 files, 12\/12 screenshots, 12\/12 manifest-linked design references, references ready \(ready source, 0 missing, 0 updates, 12\/12 required source references available\)\)/,
  );

  check.visualArtifact.referenceImport = {
    ...check.visualArtifact.referenceImport,
    complete: false,
    firstMissingReferenceReason: "hero-banner-desktop.png is missing",
    firstMissingReferencePreview:
      "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png (1440x1000)",
    missingCount: 1,
    missingReferences: [
      "docs/visual/page-builder-references/hero-banner-desktop.png",
    ],
    requiredReferenceStatusCounts: {
      invalid: 0,
      missing: 1,
      ready: 11,
      updated: 0,
      wouldUpdate: 0,
    },
    status: "invalid",
  };
  const missingReferenceArtifact = createProjectStatusArtifact(check);
  const missingReferenceMarkdown = createProjectStatusMarkdown(
    missingReferenceArtifact,
  );

  const missingReferenceTerminal = formatProjectStatusArtifact(
    missingReferenceArtifact,
  ).join("\n");
  assert.match(
    missingReferenceTerminal,
    /first missing docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
  );
  assert.match(
    missingReferenceTerminal,
    /first missing reason hero-banner-desktop\.png is missing/,
  );
  assert.equal(
    missingReferenceArtifact.releaseGate.visual.artifactCheck.referenceImport
      .firstMissingReferencePreview,
    "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png (1440x1000)",
  );
  assert.equal(
    missingReferenceArtifact.releaseGate.visual.artifactCheck.referenceImport
      .firstMissingReferenceReason,
    "hero-banner-desktop.png is missing",
  );
  assert.match(missingReferenceMarkdown, /### Missing Visual References/);
  assert.match(
    missingReferenceMarkdown,
    /Source dir: `docs\/visual\/page-builder-references`/,
  );
  assert.match(missingReferenceMarkdown, /Missing files: 1/);
  assert.match(
    missingReferenceMarkdown,
    /Required source references: 11\/12 available \(1 missing, 11 ready\)/,
  );
  assert.match(
    missingReferenceMarkdown,
    /First missing reason: hero-banner-desktop\.png is missing/,
  );
  assert.match(
    missingReferenceMarkdown,
    /First missing preview: `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png \(1440x1000\)`/,
  );
  assert.match(
    missingReferenceMarkdown,
    /`docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    missingReferenceMarkdown,
    /Design request: `pnpm visual:references:request`/,
  );
});

test("project status docs mention visual artifact path and counts", async () => {
  const [readme, setupDoc, releaseChecklist] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(readme, /artifact complete` 及 artifact 路径、文件\/截图计数/);
  assert.match(readme, /releaseGate\.visual\.failedMeasurementCount/);
  assert.match(readme, /releaseGate\.visual\.failedMeasurementViewportCount/);
  assert.match(readme, /releaseGate\.visual\.firstFailedMeasurement/);
  assert.match(readme, /releaseGate\.visual\.artifactCheck/);
  assert.match(readme, /missingReferences/);
  assert.match(readme, /Missing Visual References/);
  assert.match(readme, /pnpm visual:references:request/);
  assert.match(readme, /release-check\.md.*project-status\.md/s);
  assert.match(
    setupDoc,
    /prints failed visual measurement\s+viewport\/metric counts and the first failed measurement when measured metrics\s+are below target, plus its artifact path, issue count, file count, screenshot\s+counts, reference-import missing\/update counts, required source reference\s+availability, and the first missing reference path/s,
  );
  assert.match(setupDoc, /retained preview\s+summary in the release gate summary/s);
  assert.match(setupDoc, /Missing Visual References/);
  assert.match(setupDoc, /pnpm visual:references:request/);
  assert.match(setupDoc, /release-check\.md.*project-status\.md/s);
  assert.match(setupDoc, /releaseGate\.visual\.artifactCheck/);
  assert.match(
    releaseChecklist,
    /artifact path,\s+issue, file, screenshot, failed visual measurement viewport\/metric counts,\s+the first failed measurement when measured metrics are below target,\s+reference-import missing\/update counts, required source reference\s+availability, and the first missing reference path/s,
  );
  assert.match(releaseChecklist, /first missing reference path plus retained preview\s+summary/s);
  assert.match(releaseChecklist, /Missing Visual References/);
  assert.match(releaseChecklist, /pnpm visual:references:request/);
  assert.match(releaseChecklist, /release-check\.md.*project-status\.md/s);
});
