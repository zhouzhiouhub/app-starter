import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";

test("visual reference intake directory documents every required file", () => {
  const readmePath = "docs/visual/page-builder-references/README.md";

  assert.equal(existsSync(readmePath), true);

  const referenceReadme = readFileSync(readmePath, "utf8");

  assert.match(referenceReadme, /real Page Builder design\s+reference PNGs/);
  assert.match(referenceReadme, /corrupted file is rejected during intake/);
  assert.match(referenceReadme, /decoded PNG dimensions/);
  assert.match(referenceReadme, /Required Source Files/);
  assert.match(
    referenceReadme,
    /pnpm visual:references` uses it\s+when `--source-dir` is omitted/,
  );
  assert.match(referenceReadme, /pnpm visual:references:check/);
  assert.match(
    referenceReadme,
    /visual:references -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --require-complete/,
  );
  assert.match(
    referenceReadme,
    /visual:capture:fixture -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output-dir reports\/visual\/page-builder-fixture --report reports\/visual\/page-builder-fixture\/visual-capture-report\.json --write-manifest/,
  );

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      assert.match(
        referenceReadme,
        new RegExp(`${component}-${viewport}\\.png`, "u"),
      );
    }
  }
});
