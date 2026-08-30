# Release Records

This directory stores retained Markdown release records generated from ready
`release-evidence-check.v1` artifacts.

Each final release record should be generated with `pnpm release:notes` after
the combined release gate is ready. Do not write formal sign-off notes from
manually edited evidence, local-only smoke output, or blocked release checks.

## Required Source Evidence

- Main CI local verification workflow run URL.
- `local-verification-<run_number>` artifact from the main CI run.
- Production Smoke workflow run URL.
- `production-smoke-report-<run_number>` artifact.
- `release-preflight-<run_number>` artifact.
- `release-evidence-check-<run_number>` artifact.
- `project-status-<run_number>` artifact.
- `page-builder-visual-fixture-<run_number>` artifact when visual evidence is
  part of the release review.
- Public production storefront URL.
- Rollback target.

## Command

```powershell
pnpm release:notes -- --release-tag v0.1.0 --workflow-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/123 --local-verification-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/122 --local-verification-artifact local-verification-122 --smoke-artifact production-smoke-report-123 --preflight-artifact release-preflight-123 --release-artifact release-evidence-check-123 --project-status artifacts/release/project-status.json --project-status-artifact project-status-123 --visual-artifact page-builder-visual-fixture-123 --storefront-url https://store.brand.com --rollback-target main@abcdef1 --output docs/releases/v0.1.0.md
```

Failure review drafts may use `--allow-blocked`, but they are not release
sign-off records. They include `Project Next Actions` from the validated
project status artifact so the blocked production smoke or Page Builder visual
repair steps stay attached to the failed review.
