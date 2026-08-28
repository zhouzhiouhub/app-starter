# Page Builder Visual Acceptance

This record tracks the MVP requirement that the six core Page Builder sections
reach about 95% visual match against Desktop and Mobile design references.

The source of truth is
`docs/development/page-builder-visual-acceptance.json`.

## Commands

```powershell
pnpm visual:acceptance
pnpm visual:acceptance -- --require-accepted
```

Use the default command while collecting evidence. Use `--require-accepted` for
release sign-off after every core section has design references, preview
screenshots, and measured diff values.

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
- Do not use URLs, absolute paths, parent directory segments, transient `tmp/`
  paths, or non-image files for accepted evidence.
- Records may stay `needs-evidence` while the renderer exists but the real
  design source or screenshot has not been attached.

## Current State

The current manifest proves the tracking structure and component coverage. It
does not prove the final 95% visual acceptance yet because the real design
references and browser screenshots are still pending.
