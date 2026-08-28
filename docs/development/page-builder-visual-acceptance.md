# Page Builder Visual Acceptance

This record tracks the MVP requirement that the six core Page Builder sections
reach about 95% visual match against Desktop and Mobile design references.

The source of truth is
`docs/development/page-builder-visual-acceptance.json`.

## Commands

```powershell
pnpm visual:acceptance
pnpm visual:acceptance -- --checklist
pnpm visual:acceptance -- --require-accepted
pnpm visual:capture
pnpm visual:capture:fixture
pnpm visual:measure
pnpm visual:measure -- --write
```

Use the default command while collecting evidence. Use `--checklist` to print
the per-component Desktop and Mobile evidence tasks that still block release
sign-off. Use `--require-accepted` for release sign-off after every core section
has design references, preview screenshots, and measured diff values. Use
`pnpm visual:capture` after starting the Web app with the fixture flag to
refresh the component-level browser screenshots referenced by the manifest. Use
`pnpm visual:capture:fixture` for the full local workflow: build Web, start the
gated fixture server, capture the screenshots, and stop the server. Use
`pnpm visual:measure` after attaching design references to calculate
`visualMatchPercent`, `maxLayoutDeltaPx`, and `maxColorDeltaE`; pass `--write`
to persist the measured values to the manifest.

## Fixture Route

The Web app exposes a gated screenshot fixture for the six MVP core sections.
It is disabled by default and must not be enabled in production.

```powershell
$env:ENABLE_VISUAL_ACCEPTANCE_FIXTURE = "true"
pnpm --filter @app-starter/web dev
```

Capture browser screenshots from:

- `http://localhost:3000/visual-acceptance?viewport=desktop`
- `http://localhost:3000/visual-acceptance?viewport=mobile`
- `http://localhost:3000/visual-acceptance?viewport=desktop&component=hero-banner`
- `http://localhost:3000/visual-acceptance?viewport=mobile&component=hero-banner`

The route renders a Page Schema through `@app-starter/renderer` and resolves
fixture `media://` references through local, whitelisted assets. The optional
`component` query isolates one core section and only accepts the six MVP
component IDs listed in this document. It provides a stable capture target;
final sign-off still needs the real design references, saved browser
screenshots, and measured diff values in the manifest.

To capture all component-level fixture screenshots with an already running Web
fixture server:

```powershell
pnpm visual:capture
```

To run the full local workflow in one command:

```powershell
pnpm visual:capture:fixture
```

Set `PAGE_BUILDER_VISUAL_BROWSER` or pass `--browser` when Chrome or Edge is
not installed in a standard location.

## CI Workflow

The `Page Builder Visual` GitHub Actions workflow runs on visual-related pull
requests, pushes to `main`, and manual dispatch. It executes `pnpm test:visual`,
`pnpm visual:acceptance -- --checklist`, `pnpm visual:measure`, and
`pnpm visual:capture:fixture -- --output-dir reports/visual/page-builder-fixture`.

The workflow uploads `page-builder-visual-fixture-<run_number>` with the fixture
screenshots captured under `reports/visual/page-builder-fixture`. This artifact
is regression evidence for the fixture and capture pipeline only. Final MVP
visual sign-off still requires real Desktop and Mobile design references,
measured diff values, and `pnpm visual:acceptance -- --require-accepted`.
When an accepted manifest references screenshots from that artifact, pass the
artifact name and workflow run id to `Production Smoke` so it downloads the
files to `reports/visual/page-builder-fixture` before running the combined
release gate. The Page Builder Visual workflow summary prints the run id to use
with the Production Smoke `visual_artifact_run_id` input.

After real Desktop and Mobile design reference PNGs are attached to the
manifest, calculate the metrics with:

```powershell
pnpm visual:measure -- --write --require-complete
```

Use `--accept-passing` only when the measured values pass the configured
thresholds and the design review is ready to mark those viewport records as
accepted.
The metric reader supports the non-interlaced 8-bit RGB/RGBA PNG files commonly
exported by browser screenshots and design tools.

## Evidence Rules

- Every MVP section must have a record: `hero-banner`, `rich-text`,
  `image-gallery`, `cta-bar`, `faq`, and `spec-table`.
- Every record must contain both `desktop` and `mobile` evidence slots.
- Accepted viewport evidence needs a design reference, a browser preview
  screenshot, `visualMatchPercent >= 95`, `maxLayoutDeltaPx <= 5`, and
  `maxColorDeltaE <= 3`.
- Evidence paths must be retained relative image paths. Design references may
  live under `docs/`, `artifacts/visual/`, or `reports/visual/`; preview
  screenshots must live under `artifacts/visual/` or `reports/visual/`.
- Accepted evidence paths must point to non-empty files retained in the
  repository or release artifact bundle; missing files block sign-off.
- Evidence paths that are filled before final acceptance are also validated for
  safe relative path format and retained non-empty image files.
- Do not use URLs, absolute paths, parent directory segments, transient `tmp/`
  paths, or non-image files for accepted evidence.
- Records may stay `needs-evidence` while the renderer exists but the real
  design source or screenshot has not been attached.

## Current State

The current manifest proves the tracking structure and component coverage, and
reserves component-level fixture screenshot paths under `artifacts/visual/`.
It does not prove the final 95% visual acceptance yet because the real design
references and measured diff values are still pending. `pnpm visual:measure`
is available to calculate those values once references are attached.
