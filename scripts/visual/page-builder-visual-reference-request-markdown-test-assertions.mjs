import assert from "node:assert/strict";
import {
  createPageBuilderVisualReferenceRequestMarkdown,
} from "./page-builder-visual-reference-request.mjs";

export function assertDesignFacingVisualReferenceRequestMarkdown() {
  const markdown = createPageBuilderVisualReferenceRequestMarkdown({
    complete: false,
    jsonOutputPath: "artifacts/visual/page-builder-reference-export-manifest.json",
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missingOutputPath: "artifacts/visual/page-builder-missing-references.txt",
    tableOutputPath: "artifacts/visual/page-builder-reference-export-table.tsv",
    requiredReferences: [
      {
        component: "hero-banner",
        expectedPath: "docs/visual/page-builder-references/hero-banner-desktop.png",
        previewScreenshot: {
          height: 1000,
          path: "reports/visual/page-builder-fixture/page-builder-visual-fixture-hero-banner-desktop.png",
          width: 1440,
        },
        reason:
          "hero-banner-desktop.png appears to be a generated placeholder; use the approved design export instead",
        status: "missing",
        viewport: "desktop",
      },
      {
        component: "faq",
        expectedPath: "docs/visual/page-builder-references/faq-mobile.png",
        status: "ready",
        viewport: "mobile",
      },
    ],
    sourceDir: "docs/visual/page-builder-references",
    status: "needs-evidence",
  });

  assert.match(markdown, /^# Page Builder Design Reference Request/m);
  assert.match(markdown, /Missing references: 1\/2/);
  assert.match(
    markdown,
    /First missing reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    /First missing reason: hero-banner-desktop\.png appears to be a generated placeholder; use the approved design export instead/,
  );
  assert.match(
    markdown,
    /First missing preview: `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png \(1440x1000\)`/,
  );
  assert.match(
    markdown,
    /Missing path output: `artifacts\/visual\/page-builder-missing-references\.txt`/,
  );
  assert.match(
    markdown,
    /Export table output: `artifacts\/visual\/page-builder-reference-export-table\.tsv`/,
  );
  assert.match(
    markdown,
    /Export manifest output: `artifacts\/visual\/page-builder-reference-export-manifest\.json`/,
  );
  assert.match(markdown, /Export real PNGs from the approved design source/);
  assert.match(markdown, /matching preview viewport size shown as reference size/);
  assert.match(markdown, /## Reference PNG Dimensions/);
  assert.match(
    markdown,
    /hero-banner\.desktop: reference size 1440x1000; `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(
    markdown,
    /faq\.mobile: reference size unknown; `docs\/visual\/page-builder-references\/faq-mobile\.png`/,
  );
  assert.match(
    markdown,
    /hero-banner\.desktop; missing; reason hero-banner-desktop\.png appears to be a generated placeholder; use the approved design export instead; reference size 1440x1000; preview `reports\/visual\/page-builder-fixture\/page-builder-visual-fixture-hero-banner-desktop\.png` \(1440x1000\)/,
  );
  assert.match(markdown, /faq\.mobile; ready; reference size unknown/);
  assert.match(markdown, /pnpm visual:references:check/);
  assert.match(markdown, /pnpm visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/);
  assert.match(markdown, /pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/);
  assert.match(markdown, /pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/);
  assert(
    markdown.indexOf("pnpm visual:references:check") <
      markdown.indexOf(
        "pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
      ),
    "reference request should run the read-only intake check before writing the manifest",
  );
}
