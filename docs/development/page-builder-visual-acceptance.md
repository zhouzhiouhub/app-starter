# Page Builder Visual Acceptance

This record tracks the MVP requirement that the six core Page Builder sections
reach about 95% visual match against Desktop and Mobile design references.

The default manifest is
`docs/development/page-builder-visual-acceptance.json`; treat it as the
repository template and local collection record. Release sign-off should use the
artifact-local copy at
`reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`, so
imported references, captured screenshots, measured metrics, and accepted
statuses are archived with the `page-builder-visual-fixture-<run_number>`
artifact.

## Commands

```powershell
pnpm visual:acceptance
pnpm visual:acceptance -- --checklist
pnpm visual:acceptance -- --json
pnpm visual:acceptance -- --checklist --output reports/visual/page-builder-fixture/visual-acceptance-report.json
pnpm visual:acceptance -- --markdown-output reports/visual/page-builder-fixture/visual-acceptance-report.md
pnpm visual:acceptance -- --require-accepted
pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture
pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture
pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md
pnpm visual:capture
pnpm visual:capture:fixture
pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest
pnpm visual:measure
pnpm visual:measure -- --write
pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete
pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete
pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete
pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete
```

Use the default command while collecting evidence. Use `--checklist` to print
the per-component Desktop and Mobile evidence tasks that still block release
sign-off, including unsafe paths, missing retained files, and empty image files
for any evidence path that has already been filled. The checklist also includes
the expected `docs/visual/page-builder-references/<component>-<viewport>.png`
reference path, the expected retained fixture screenshot path, and the exact
import, capture, measure, accept-passing, and final verification commands for
each viewport.
When the checked manifest lives under `reports/visual/` or `artifacts/visual/`,
the suggested capture command and screenshot path follow that artifact
directory.
Use `--require-accepted` for release sign-off after every core section has
design references, preview screenshots, and measured diff values. Use
`pnpm visual:capture` after starting the Web app with the fixture flag to
refresh the component-level browser screenshots referenced by the manifest. Use
`--json` for a machine-readable report and `--output` to write that report to a
safe `.json` path under `tmp/`, `reports/`, `artifacts/`, or `.tmp/`. Use
`--markdown-output` to write a human-readable evidence handoff under
`docs/visual/`, `artifacts/visual/`, `reports/visual/`, `tmp/`, or `.tmp/`;
it includes the same per-viewport paths and commands even when `--checklist`
is not printed to stdout. When `--checklist` is present, the JSON artifact
includes the per-viewport missing evidence tasks. Use
`pnpm visual:capture:fixture` for the full local workflow: build Web, start the
gated fixture server, capture the screenshots, and stop the server. Use
`pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture`
when you need the full uploadable fixture evidence bundle; it copies the source
manifest into the artifact directory, captures all 12 viewport screenshots,
writes `visual-capture-report.json`, writes
`visual-reference-import-report.json`, `visual-reference-import-report.md`, runs measurement, writes
`visual-acceptance-report.json`, `visual-acceptance-report.md`, and
`visual-artifact-check-report.json`, `visual-artifact-check-report.md`, and verifies the bundle with
`visual:artifact-check`.
Use
`pnpm visual:references` after placing real design reference PNGs in a retained
source directory to inspect or update `designReference` values and reset stale
metrics. Add
`--manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete`
when importing into the uploadable artifact manifest. This keeps machine-readable
and human-readable reference intake reports listing missing PNGs, imported paths,
and the next command. Use `pnpm visual:measure` after attaching design
references to calculate `visualMatchPercent`, `maxLayoutDeltaPx`, and
`maxColorDeltaE`; pass `--write` to persist the measured values to the
manifest, and pass `--manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`
when measuring the artifact-local manifest.
Pass `--write-manifest` to `visual:capture` or `visual:capture:fixture` only
when the captured browser screenshots should update `previewScreenshot` paths in
the manifest. This resets stale diff metrics and keeps viewport status as
`needs-evidence`; it does not mark visual evidence accepted.
Pass `--report reports/visual/page-builder-fixture/visual-capture-report.json`
to keep a structured `page-builder-visual-capture.v1` capture report with the
browser, output directory, and per-viewport screenshot paths.
Use `pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture`
after capture and acceptance report generation to verify the artifact-local
manifest, capture report, acceptance report, and all 12 screenshot PNGs are
present, internally consistent, decodable, and sized to the capture viewport.
The check also verifies that `visual-reference-import-report.json` and
`visual-reference-import-report.md` are retained for the artifact-local manifest
and default reference intake directory, and that `visual-acceptance-report.md`
is retained with status and counts matching the artifact-local manifest.
Add
`--output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md`
when the artifact integrity result should be retained as machine-readable and
human-readable release review files.

Reference import expects files named `<component>-<viewport>.png`, such as
`hero-banner-desktop.png` and `hero-banner-mobile.png`. It is dry-run by
default; pass `--write` to update the manifest, `--markdown-output` to retain
the intake report, and `--require-complete` to fail when any of the 12 MVP
reference PNGs is missing. If the source directory has not been created yet or
points at a file instead of a directory, the importer records `sourceDirStatus`
and still writes the full missing-reference checklist to the JSON/Markdown
reports.

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

To build the same artifact bundle shape uploaded by CI:

```powershell
pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture
```

To capture into the same directory used by the GitHub Actions artifact and
point the manifest at those retained screenshots:

```powershell
pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --write-manifest
```

To also archive a structured capture report with the retained screenshots:

```powershell
pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest
```

Set `PAGE_BUILDER_VISUAL_BROWSER` or pass `--browser` when Chrome or Edge is
not installed in a standard location. Browser launch failures print a bounded,
normalized snippet of captured stdout/stderr so headless runtime, sandbox, or
binary path problems can be diagnosed from the command output.

## CI Workflow

The `Page Builder Visual` GitHub Actions workflow runs on visual-related pull
requests, pushes to `main`, changes under
`docs/visual/page-builder-references/`, and manual dispatch. It executes
`pnpm test:visual`, then executes
`pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture`.
The bundle command copies the source manifest to
`reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`,
captures all fixture screenshots, runs measurement, writes
`visual-capture-report.json`, `visual-reference-import-report.json`,
`visual-reference-import-report.md`,
`visual-acceptance-report.json`, `visual-acceptance-report.md`, and
`visual-artifact-check-report.json`, `visual-artifact-check-report.md`, and verifies the uploaded bundle with
`visual:artifact-check`.

The workflow uploads `page-builder-visual-fixture-<run_number>` with the fixture
screenshots, an artifact-local manifest with captured `previewScreenshot` paths,
`visual-capture-report.json`, `visual-reference-import-report.json`,
`visual-reference-import-report.md`,
`visual-acceptance-report.json`, and `visual-acceptance-report.md` plus
`visual-artifact-check-report.json` and `visual-artifact-check-report.md` captured under
`reports/visual/page-builder-fixture`;
the upload step fails when the bundle is
missing instead of leaving only a warning. The source manifest under
`docs/development/` remains unchanged by CI. This artifact is regression
evidence for the fixture and capture pipeline only. Final MVP visual sign-off
still requires real Desktop and Mobile design references, measured diff values, and
`pnpm visual:acceptance -- --require-accepted`.
When an accepted manifest references screenshots from that artifact, pass the
artifact name and workflow run id to `Production Smoke` so it downloads the
files to `reports/visual/page-builder-fixture` before running the combined
release gate. The combined gate then runs with
`--visual-artifact-dir reports/visual/page-builder-fixture`, reads the
artifact-local manifest by default, and records the artifact check result in
`release-evidence-check.v1` as `visual.artifactCheck`. The artifact check also
validates the reference-import status, missing/update counts, any recorded
`sourceDirStatus` value, and the matching Markdown lines. The Page Builder Visual
workflow summary prints the run id to use with the Production Smoke
`visual_artifact_run_id` input.
When the same default artifact is complete on a local machine, plain
`pnpm project:status` automatically includes it in the informational status
summary. Keep using explicit `--visual-artifact-dir reports/visual/page-builder-fixture`
for `release:check` and production handoff commands that must formally evaluate
the downloaded artifact.

After real Desktop and Mobile design reference PNGs are attached to the
manifest, calculate the metrics with:

```powershell
pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete
```

Use `--accept-passing` only when the measured values pass the configured
thresholds and the design review is ready to mark those viewport records as
accepted. Keep `--require-complete` on the same command for release sign-off so
missing reference or screenshot pairs still fail the run.
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
- Preview screenshots retained in a Page Builder Visual artifact must be
  decodable PNG files sized to the capture viewport: desktop `1440x1000` and
  mobile `390x1000`.
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
