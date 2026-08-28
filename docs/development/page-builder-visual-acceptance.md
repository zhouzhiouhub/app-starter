# Page Builder Visual Acceptance

This record tracks the MVP requirement that the six core Page Builder sections
reach about 95% visual match against Desktop and Mobile design references.

The source of truth is
`docs/development/page-builder-visual-acceptance.json`.

## Commands

```powershell
pnpm visual:acceptance
pnpm visual:acceptance -- --require-accepted
pnpm visual:capture
```

Use the default command while collecting evidence. Use `--require-accepted` for
release sign-off after every core section has design references, preview
screenshots, and measured diff values. Use `pnpm visual:capture` after starting
the Web app with the fixture flag to refresh the component-level browser
screenshots referenced by the manifest.

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

To capture all component-level fixture screenshots in one pass:

```powershell
pnpm --filter @app-starter/web build
$env:ENABLE_VISUAL_ACCEPTANCE_FIXTURE = "true"
pnpm --filter @app-starter/web start
pnpm visual:capture
```

Set `PAGE_BUILDER_VISUAL_BROWSER` or pass `--browser` when Chrome or Edge is
not installed in a standard location.

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
references and measured diff values are still pending.
