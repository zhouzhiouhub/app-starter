# Page Builder Design References

This directory is the retained source location for real Page Builder design
reference PNGs used during MVP visual acceptance.

Do not use fixture screenshots, generated placeholders, or temporary exports as
accepted design references. Final sign-off requires images exported from the
approved design source for each MVP core section and viewport.

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
2. Run `pnpm visual:references -- --source-dir docs/visual/page-builder-references --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md`.
3. Review the generated Markdown report and fix any missing or empty PNGs.
4. Run `pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete`.
5. Capture retained browser screenshots with `pnpm visual:capture:fixture -- --write-manifest`.
6. Run `pnpm visual:measure -- --write --require-complete`.
7. Review the measured evidence and finish with `pnpm visual:acceptance -- --require-accepted`.

The reference importer only writes manifest paths and resets stale metrics. It
does not mark a viewport as accepted.

Changes in this directory trigger the `Page Builder Visual` GitHub Actions
workflow so fixture evidence can be refreshed before Production Smoke consumes
the visual artifact.
