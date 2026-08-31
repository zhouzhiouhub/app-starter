# Page Builder Design References

This directory is the retained source location for real Page Builder design
reference PNGs used during MVP visual acceptance.

Do not use fixture screenshots, generated placeholders, or temporary exports as
accepted design references. Final sign-off requires images exported from the
approved design source for each MVP core section and viewport. Each file must be
a non-empty PNG that can be parsed by the visual measurement tooling; a renamed
or corrupted file is rejected during intake.

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
2. Run `pnpm visual:references:check`.
3. Review the generated Markdown report and fix any missing or empty PNGs.
4. Run `pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`.
5. Capture retained browser screenshots with `pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest`.
6. Run `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`.
7. Review the measured evidence, then run `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete`.
8. Finish with `pnpm visual:acceptance -- --require-accepted reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`.

The reference importer only writes manifest paths and resets stale metrics. It
does not mark a viewport as accepted. If this directory is missing or is not a
directory, the importer still writes a reference intake report with
`sourceDirStatus` and the full required PNG checklist. The Markdown report's
`Required Source Files` section always lists all 12 component and viewport PNGs
with `missing`, `ready`, `would-update`, or `updated` intake status.
Because this directory is the repo default, `pnpm visual:references` uses it
when `--source-dir` is omitted; keep the explicit option when reviewing an
alternate archive or downloaded evidence bundle.
`pnpm visual:references:check` writes the default release fixture JSON and
Markdown intake reports without updating the manifest.

Changes in this directory trigger the `Page Builder Visual` GitHub Actions
workflow so fixture evidence can be refreshed before Production Smoke consumes
the visual artifact.
