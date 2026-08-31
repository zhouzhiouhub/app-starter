import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPageBuilderVisualReferenceImportArtifact } from "./page-builder-visual-reference-import.mjs";

test("visual reference import artifact includes complete required reference intake list", () => {
  const artifact = createPageBuilderVisualReferenceImportArtifact(
    {
      complete: false,
      manifestPath:
        "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
      missing: [
        {
          component: "hero-banner",
          expectedPath: "docs/visual/page-builder-references/hero-banner-desktop.png",
          previewScreenshot: {
            height: 1000,
            path: "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
            width: 1440,
          },
          reason: "hero-banner-desktop.png is missing",
          viewport: "desktop",
        },
      ],
      sourceDir: "docs/visual/page-builder-references",
      sourceDirStatus: "ready",
      status: "invalid",
      updated: false,
      updates: [
        {
          component: "hero-banner",
          designReference:
            "docs/visual/page-builder-references/hero-banner-mobile.png",
          previewScreenshot: {
            height: 1000,
            path: "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-mobile.png",
            width: 390,
          },
          viewport: "mobile",
        },
      ],
    },
    { generatedAt: "2026-08-31T00:00:00.000Z" },
  );

  assert.equal(artifact.requiredReferenceCount, 12);
  assert.equal(artifact.requiredReferences.length, 12);
  assert.deepEqual(artifact.requiredReferences[0], {
    component: "hero-banner",
    expectedPath: "docs/visual/page-builder-references/hero-banner-desktop.png",
    previewScreenshot: {
      height: 1000,
      path: "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
      width: 1440,
    },
    reason: "hero-banner-desktop.png is missing",
    status: "missing",
    viewport: "desktop",
  });
  assert.deepEqual(artifact.requiredReferences[1], {
    component: "hero-banner",
    designReference:
      "docs/visual/page-builder-references/hero-banner-mobile.png",
    expectedPath: "docs/visual/page-builder-references/hero-banner-mobile.png",
    previewScreenshot: {
      height: 1000,
      path: "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-mobile.png",
      width: 390,
    },
    status: "would-update",
    viewport: "mobile",
  });
  assert.deepEqual(artifact.requiredReferences.at(-1), {
    component: "spec-table",
    expectedPath: "docs/visual/page-builder-references/spec-table-mobile.png",
    status: "ready",
    viewport: "mobile",
  });
});

test("visual reference import artifact marks written updates as updated", () => {
  const artifact = createPageBuilderVisualReferenceImportArtifact({
    complete: true,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missing: [],
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: "updated",
    updated: true,
    updates: [
      {
        component: "faq",
        designReference: "docs/visual/page-builder-references/faq-mobile.png",
        viewport: "mobile",
      },
    ],
  });

  assert.equal(
    artifact.requiredReferences.find(
      (reference) =>
        reference.component === "faq" && reference.viewport === "mobile",
    ).status,
    "updated",
  );
});

test("visual reference import artifact handoff fields are documented", () => {
  const readme = readFileSync("README.md", "utf8");
  const acceptanceDoc = readFileSync(
    "docs/development/page-builder-visual-acceptance.md",
    "utf8",
  );
  const releaseChecklist = readFileSync(
    "docs/development/release-checklist.md",
    "utf8",
  );
  const referenceReadme = readFileSync(
    "docs/visual/page-builder-references/README.md",
    "utf8",
  );

  assert.match(readme, /requiredReferences\[\]/);
  assert.match(acceptanceDoc, /requiredReferenceCount/);
  assert.match(releaseChecklist, /requiredReferences\[\]/);
  assert.match(referenceReadme, /requiredReferences\[\]/);
});
