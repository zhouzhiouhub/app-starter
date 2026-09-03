# Page Builder Design References

This directory is the retained source location for real Page Builder design
reference PNGs used during MVP visual acceptance.

Do not use fixture screenshots, generated placeholders, or temporary exports as
accepted design references. Final sign-off requires images exported from the
approved design source for each MVP core section and viewport. Each file must be
a non-empty PNG that can be parsed by the visual measurement tooling; a
corrupted file is rejected during intake, and so is a renamed file or an obvious
generated placeholder.
If placeholder PNGs are present, intake treats them as missing evidence until
they are replaced by the approved design export.

## Required Files

- `hero-banner-desktop.png`
- `hero-banner-mobile.png`
- `rich-text-desktop.png`
- `rich-text-mobile.png`
- `image-gallery-desktop.png`
- `image-gallery-mobile.png`
- `cta-bar-desktop.png`
- `cta-bar-mobile.png`
- `faq-desktop.png`
- `faq-mobile.png`
- `spec-table-desktop.png`
- `spec-table-mobile.png`

## Intake Flow

1. Export each approved design reference as a PNG using the component and
   viewport names above.
2. Run `pnpm --silent visual:references:missing` when you need a copy-ready
   list of missing PNG paths.
3. Run `pnpm visual:references:request` when the design owner needs a Markdown
   export request with the file list, preview screenshots, and follow-up
   commands. The request lists each required PNG's reference size target beside
   the exact file path; it also writes
   `artifacts/visual/page-builder-missing-references.txt`,
   `artifacts/visual/page-builder-reference-export-table.tsv`, and
   `artifacts/visual/page-builder-reference-export-manifest.json`, and the
   terminal summary prints the first missing reference path.
4. Run `pnpm visual:references:handoff` when the design owner needs the request
   files plus copied preview screenshots and a handoff README in
   `artifacts/visual/page-builder-reference-handoff`.
5. Run `pnpm visual:references:check`.
6. Review the generated Markdown report and fix any missing, empty, or
   placeholder PNGs.
7. Run `pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`.
8. Capture retained browser screenshots with `pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest`.
9. Run `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`.
10. Review the measured evidence, then run `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete`.
11. Finish with `pnpm visual:acceptance -- --require-accepted reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`.

The reference importer only writes manifest paths and resets stale metrics. It
does not mark a viewport as accepted. If this directory is missing or is not a
directory, the importer still writes a reference intake report with
`sourceDirStatus` and the full required PNG checklist. The JSON report's
`requiredReferences[]` list and the Markdown report's `Required Source Files`
section always list all 12 component and viewport PNGs with `missing`, `ready`,
`would-update`, or `updated` intake status.
When the manifest has retained `previewScreenshot` paths, the intake report also
shows the preview screenshot path and decoded PNG dimensions beside each missing
or imported reference so the design export can match the captured viewport.
Because this directory is the repo default, `pnpm visual:references` uses it
when `--source-dir` is omitted; keep the explicit option when reviewing an
alternate archive or downloaded evidence bundle.
`pnpm visual:references:check` writes the default release fixture JSON and
Markdown intake reports without updating the manifest.
`pnpm --silent visual:references:missing` uses the same default manifest and
source directory, but prints only missing expected PNG paths, one per line.
`pnpm visual:references:request` writes
`artifacts/visual/page-builder-reference-request.md` as a design-facing request;
it also writes `artifacts/visual/page-builder-missing-references.txt` as a
plain missing path list and
`artifacts/visual/page-builder-reference-export-table.tsv` as a TSV task table
with component, viewport, `file_name`, status, rejection reason, target size,
target path, and preview path columns,
plus `artifacts/visual/page-builder-reference-export-manifest.json` as a
machine-readable export manifest for automation handoff. Its terminal summary
prints the first missing reference path. The request includes a
`Reference PNG Dimensions` section so design exports can match the captured
Desktop / Mobile viewport size. It does not import references or mark visual
evidence accepted.
`pnpm visual:references:handoff` writes the same request files plus copied
preview screenshots, a handoff README, and a handoff manifest under
`artifacts/visual/page-builder-reference-handoff`. Use it when the design owner
needs a single local directory for export coordination. The README summarizes
package status, copied previews, and after-delivery commands; the handoff
manifest records each copied preview screenshot's dimensions, byte size, and
sha256 so a designer or release reviewer can detect empty files, wrong
screenshots, or stale copies before exporting references; it does not create
reference PNGs or mark evidence accepted.
Use `--output <path>` and `--missing-output <path>` when a release handoff needs
those request files in a custom evidence directory. Use `--table-output <path>`
for a custom TSV export task table location, and `--json-output <path>` for a
custom JSON export manifest location.

Changes in this directory trigger the `Page Builder Visual` GitHub Actions
workflow so fixture evidence can be refreshed before Production Smoke consumes
the visual artifact.
