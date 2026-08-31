import assert from "node:assert/strict";
import test from "node:test";
import { formatMissingVisualReferenceFiles } from "./page-builder-visual-missing-references-markdown.mjs";

test("missing visual references Markdown includes intake commands", () => {
  const markdown = formatMissingVisualReferenceFiles({
    artifactCheck: {
      referenceImport: {
        manifestPath:
          "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
        missingCount: 2,
        missingReferences: [
          "docs/visual/page-builder-references/hero-banner-desktop.png",
          "docs/visual/page-builder-references/hero-banner-mobile.png",
        ],
        sourceDir: "docs/visual/page-builder-references",
        sourceDirStatus: "ready",
        status: "invalid",
        updateCount: 0,
      },
    },
  }).join("\n");

  assert.match(markdown, /### Missing Visual References/);
  assert.match(markdown, /Missing files: 2/);
  assert.match(
    markdown,
    /- `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(markdown, /### Visual Reference Intake Commands/);
  assert.match(
    markdown,
    /Reference report: `pnpm visual:references:check`/,
  );
  assert.match(
    markdown,
    /Import: `pnpm visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete`/,
  );
  assert.match(
    markdown,
    /Capture fixture: `pnpm visual:capture:fixture -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --report reports\/visual\/page-builder-fixture\/visual-capture-report\.json --write-manifest`/,
  );
  assert.match(
    markdown,
    /Measure: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete`/,
  );
  assert.match(
    markdown,
    /Accept passing: `pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete`/,
  );
  assert.match(
    markdown,
    /Verify: `pnpm visual:acceptance -- --require-accepted reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json`/,
  );
});
