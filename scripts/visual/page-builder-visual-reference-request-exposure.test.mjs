import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("visual reference request command is exposed in package and docs", () => {
  const packageJson = readFileSync("package.json", "utf8");
  const requestCli = readFileSync(
    "scripts/page-builder-visual-reference-request.mjs",
    "utf8",
  );
  const readme = readFileSync("README.md", "utf8");
  const acceptanceDoc = readFileSync(
    "docs/development/page-builder-visual-acceptance.md",
    "utf8",
  );
  const releaseChecklist = readFileSync(
    "docs/development/release-checklist.md",
    "utf8",
  );
  const setupDoc = readFileSync("docs/development/setup.md", "utf8");
  const referenceReadme = readFileSync(
    "docs/visual/page-builder-references/README.md",
    "utf8",
  );

  assert.match(packageJson, /"visual:references:request"/);
  assert.match(
    packageJson,
    /--missing-output artifacts\/visual\/page-builder-missing-references\.txt --table-output artifacts\/visual\/page-builder-reference-export-table\.tsv --json-output artifacts\/visual\/page-builder-reference-export-manifest\.json/,
  );
  assert.match(requestCli, /pnpm visual:references:request/);
  assert.match(requestCli, /--missing-output <path>/);
  assert.match(requestCli, /--table-output <path>/);
  assert.match(requestCli, /--json-output <path>/);
  assert.match(readme, /pnpm visual:references:request/);
  assert.match(readme, /page-builder-missing-references\.txt/);
  assert.match(readme, /page-builder-reference-export-table\.tsv/);
  assert.match(readme, /`file_name`/);
  assert.match(readme, /page-builder-reference-export-manifest\.json/);
  assert.match(
    readme,
    /首张缺失原因是 `hero-banner-desktop\.png appears to be a generated placeholder`/,
  );
  assert.match(acceptanceDoc, /terminal\s+and Markdown `First missing reference`/);
  assert.match(acceptanceDoc, /First missing reason/);
  assert.match(acceptanceDoc, /First missing preview/);
  assert.match(acceptanceDoc, /page-builder-missing-references\.txt/);
  assert.match(acceptanceDoc, /page-builder-reference-export-table\.tsv/);
  assert.match(acceptanceDoc, /`file_name`/);
  assert.match(acceptanceDoc, /page-builder-reference-export-manifest\.json/);
  assert.match(releaseChecklist, /first missing reference path/);
  assert.match(releaseChecklist, /first missing reason/);
  assert.match(releaseChecklist, /first missing preview/);
  assert.match(releaseChecklist, /page-builder-missing-references\.txt/);
  assert.match(releaseChecklist, /page-builder-reference-export-table\.tsv/);
  assert.match(releaseChecklist, /`file_name`/);
  assert.match(releaseChecklist, /page-builder-reference-export-manifest\.json/);
  assert.match(setupDoc, /terminal summary and Markdown\s+status.*First missing reference/s);
  assert.match(setupDoc, /First missing\s+reason/);
  assert.match(setupDoc, /First missing\s+preview/s);
  assert.match(setupDoc, /page-builder-missing-references\.txt/);
  assert.match(setupDoc, /page-builder-reference-export-table\.tsv/);
  assert.match(setupDoc, /`file_name`/);
  assert.match(setupDoc, /page-builder-reference-export-manifest\.json/);
  assert.match(referenceReadme, /pnpm visual:references:request/);
  assert.match(referenceReadme, /page-builder-missing-references\.txt/);
  assert.match(referenceReadme, /page-builder-reference-export-table\.tsv/);
  assert.match(referenceReadme, /`file_name`/);
  assert.match(referenceReadme, /page-builder-reference-export-manifest\.json/);
  assert.match(referenceReadme, /--output <path>/);
  assert.match(referenceReadme, /--missing-output <path>/);
  assert.match(referenceReadme, /--table-output <path>/);
  assert.match(referenceReadme, /--json-output <path>/);
  assert.match(referenceReadme, /first missing reference path/);
  assert.match(referenceReadme, /first missing reason/);
  assert.match(referenceReadme, /matching\s+retained preview screenshot/s);
  assert.match(referenceReadme, /Reference PNG Dimensions/);
  assert.match(referenceReadme, /reference size target/);
});
