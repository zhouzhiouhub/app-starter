# Release Checklist

Use this checklist for production release evidence. It keeps the MVP boundary
intact: Commerce and non-default Locale publishing stay disabled until their
later phases are explicitly approved.

## Before Production Smoke

- Configure the GitHub `production` environment with the required smoke secrets:
  `PRODUCTION_API_URL`, `PRODUCTION_WEB_URL`, `PRODUCTION_ADMIN_URL`,
  `PRODUCTION_DATABASE_URL`, `PRODUCTION_REDIS_URL`,
  `PRODUCTION_SMOKE_ADMIN_EMAIL`, `PRODUCTION_SMOKE_ADMIN_PASSWORD`,
  `PRODUCTION_R2_ACCOUNT_ID`, `PRODUCTION_R2_ACCESS_KEY_ID`,
  `PRODUCTION_R2_SECRET_ACCESS_KEY`, `PRODUCTION_R2_BUCKET`,
  `PRODUCTION_PREVIEW_TOKEN_SECRET`, `PRODUCTION_JWT_PRIVATE_KEY`,
  `PRODUCTION_JWT_PUBLIC_KEY`, `PRODUCTION_STOREFRONT_REVALIDATE_SECRET`, and
  `PRODUCTION_STOREFRONT_REVALIDATE_URL`.
- Configure the GitHub `production` environment vars used by the smoke runner:
  `PRODUCTION_MEDIA_CDN_BASE_URL`, `PRODUCTION_R2_REGION`,
  `PRODUCTION_ANALYTICS_ENABLED`, `PRODUCTION_ANALYTICS_CONSENT_GRANTED`, and
  any enabled analytics provider IDs.
- Confirm `API_URL`, `WEB_URL`, and `ADMIN_URL` point to production HTTPS
  origins, with `API_URL` ending at the origin or exact `/api/v1` base.
- Confirm `COMMERCE_ENABLED=false` and `MULTI_LOCALE_ENABLED=false` in the API,
  Web, and smoke runner environment.
- Confirm `DATABASE_URL` points to the production PostgreSQL instance and the
  committed Prisma migrations are the deployment source.
- Confirm `REDIS_URL` uses the production Redis endpoint, preferably `rediss://`.
- Confirm `MEDIA_CDN_BASE_URL` is the real production CDN origin or directory
  prefix, not a documentation, local, private, or reserved host.
- Confirm R2 secrets are configured in GitHub Actions production secrets before
  requiring R2 upload smoke.
- Confirm `PREVIEW_TOKEN_SECRET`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`,
  `STOREFRONT_REVALIDATE_SECRET`, and `STOREFRONT_REVALIDATE_URL` are configured
  for production.
- Confirm the smoke admin account is not the documented local default and has
  `audit:read`.
- Run `pnpm visual:acceptance -- --checklist` and keep the manifest review
  output plus per-viewport evidence task list with the release notes. The
  checklist names the expected reference PNG, retained screenshot path, and
  import/capture/measure/verify commands for each Desktop and Mobile viewport.
  After
  placing real design reference PNGs under a retained source directory, run
  `pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete`.
  Then run
  `pnpm visual:measure -- --write --require-complete` to calculate the viewport
  metrics. For final MVP sign-off, rerun `pnpm visual:acceptance` with
  `--require-accepted`; accepted screenshots must be retained under
  `artifacts/visual/` or `reports/visual/`, and every referenced evidence file
  must exist and be non-empty. Screenshots inside a Page Builder Visual artifact
  must also be decodable PNGs sized to the capture viewport: desktop
  `1440x1000` and mobile `390x1000`.
- For local screenshot capture, start Web with
  `ENABLE_VISUAL_ACCEPTANCE_FIXTURE=true` and use
  `/visual-acceptance?viewport=desktop` plus
  `/visual-acceptance?viewport=mobile`. Add
  `&component=<hero-banner|rich-text|image-gallery|cta-bar|faq|spec-table>` for
  component-level evidence, run `pnpm visual:capture` against an already
  running fixture server, or run `pnpm visual:capture:fixture` for the full
  local build/start/capture/stop workflow. Keep the flag disabled outside the
  capture session.
- Run the `Page Builder Visual` GitHub Actions workflow and keep its
  `page-builder-visual-fixture-<run_number>` artifact with the release notes.
  This artifact includes `visual-acceptance-report.json` for structured review
  status and proves fixture capture regression only; final visual sign-off still
  requires accepted real design evidence.
- Before running smoke requests, the `Production Smoke` workflow preflights the
  optional release evidence inputs with `pnpm release:preflight`:
  `visual_artifact_name` and
  `visual_artifact_run_id` must be provided together, and release notes require
  `release_tag`, `rollback_target`, and `visual_artifact_name` together.
  `allow_blocked_release_notes` must stay disabled for formal release notes and
  may only be enabled with the release note inputs to create a failure review
  draft from blocked evidence.

## Run Production Smoke

1. Open the `Production Smoke` workflow in GitHub Actions.
2. Run it against the `production` environment.
3. Keep the default `SMOKE_REPORT_PATH`:
   `artifacts/production-smoke/smoke-report.json`.
4. Keep `require_admin_app`, `require_r2_upload`, and `require_revalidation`
   enabled for production release evidence.
5. Set `storefront_host` only when the public storefront host differs from
   `WEB_URL`.
6. If the accepted visual manifest references screenshots from the Page Builder
   Visual workflow artifact, set both `visual_artifact_name` and
   `visual_artifact_run_id` so Production Smoke downloads the evidence before
   running `release:check` with
   `--visual-artifact-dir reports/visual/page-builder-fixture`.
7. To generate release notes in the same run, set `release_tag`,
   `rollback_target`, `visual_artifact_name`, and optionally `storefront_url`
   plus `release_notes_path`.
8. Keep `allow_blocked_release_notes` disabled for release sign-off. Enable it
   only when the run is expected to fail and you need a `--allow-blocked`
   failure review draft attached to the artifacts.

## Required Evidence

- The `Production Smoke` workflow run is linked from the release notes.
- The uploaded artifact `production-smoke-report-<run_number>` is attached or
  linked.
- The uploaded artifact `release-evidence-check-<run_number>` is attached or
  linked.
- When release note inputs were provided, the uploaded artifact
  `release-notes-<run_number>` is attached or linked.
- The GitHub step summary records the report path, artifact names, review
  command, source commit, source workflow run URL, and combined
  `release:check -- --checklist` command. When visual evidence is downloaded,
  that combined command includes
  `--visual-artifact-dir reports/visual/page-builder-fixture`.
- `pnpm smoke:report -- artifacts/production-smoke/smoke-report.json` output is
  saved in the workflow log.
- `pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json`
  exits successfully in the workflow log.
- The smoke report shows `summary.status=passed`.
- The smoke report includes canonical ISO `startedAt` and `finishedAt`
  timestamps, with `finishedAt` not earlier than `startedAt`.
- The smoke report includes `config.source.commitSha`,
  `config.source.repository`, `config.source.runId`, and
  `config.source.workflowRunUrl` matching the Production Smoke workflow run.
- The smoke report shows `summary.productionReady=true`.
- The traceability section shows `R2/CDN: passed`.
- The traceability section shows `Admin static app: passed`.
- The traceability section shows `Publish flow: passed`.
- The smoke report includes `starter-pages.published` with Home, Privacy Policy,
  Terms of Service, and 404 public API evidence, plus Home, Privacy Policy, and
  Terms of Service storefront HTML evidence.
- The Page Builder visual acceptance manifest covers all six MVP core sections
  and links the final accepted Desktop / Mobile evidence when MVP visual sign-off
  is requested; every linked evidence file is retained with the release.
- The latest `Page Builder Visual` workflow run and
  `page-builder-visual-fixture-<run_number>` artifact are linked when visual
  evidence is part of the release review; the artifact contains
  `page-builder-visual-acceptance.json` with artifact-local screenshot paths,
  `visual-capture-report.json` with the captured screenshot list, and
  `visual-acceptance-report.json` with the structured acceptance status.
- When `visual_artifact_run_id` was provided, the Production Smoke workflow log
  shows the Page Builder Visual artifact download before the combined release
  gate.
- When `visual_artifact_run_id` was provided, the Production Smoke workflow log
  shows `pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture`
  passing after the download and before smoke requests continue.
- `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json`
  exits successfully after the production smoke artifact and accepted Page
  Builder visual manifest are both present.
- When `visual_artifact_run_id` was provided,
  `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture`
  exits successfully and records `visual.artifactCheck.status=complete`.
- `pnpm release:check -- --checklist --smoke-report artifacts/production-smoke/smoke-report.json`
  prints the Production Smoke, Page Builder Visual, and release notes readiness
  tasks for release review, including the first Page Builder visual viewport
  tasks with their expected evidence paths and commands.
- `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --output artifacts/release/release-check.json`
  writes the combined `release-evidence-check.v1` artifact for the release
  record; its `readinessChecklist` lists the Production Smoke, Page Builder
  visual, and release notes tasks, while `visual.pendingComponents`,
  `visual.pendingViewports`, `visual.issues`, and
  `visual.checklist.pendingTasks` identify any remaining Page Builder visual
  evidence gaps and their per-viewport commands when the gate is blocked. When
  `--visual-artifact-dir` is provided, the same artifact includes
  `visual.artifactCheck` with required file, validated screenshot, and issue
  counts.
- The `Production Smoke` workflow uploads the same combined release evidence as
  `release-evidence-check-<run_number>`; the artifact includes `smoke.source`
  so release notes can trace the smoke report back to the CI run.
- `pnpm release:notes -- --release-tag <tag> --workflow-run-url <url> --smoke-artifact production-smoke-report-<run_number> --release-artifact release-evidence-check-<run_number> --visual-artifact page-builder-visual-fixture-<run_number> --storefront-url <url> --rollback-target <target> --output docs/releases/<tag>.md`
  writes the final Markdown release record from the ready
  `release-evidence-check.v1` artifact, including the readiness checklist,
  visual manifest path, optional `visual.artifactCheck` summary, pending visual
  evidence lists, visual checklist task summary, and visual issue summary when
  `--allow-blocked` is used for failure review drafts. The command validates
  the artifact's smoke summary,
  source metadata, `--workflow-run-url` match, smoke artifact name run-number
  match, traceability groups, readiness checklist, visual counts, optional
  visual artifact check, pending lists, and issue entries before writing the
  Markdown record; a ready artifact must also have no blockers, internally
  consistent smoke status, ready production smoke with source metadata, fully
  accepted visual evidence with no pending or issue entries, and any recorded
  visual artifact check must be complete.
- The `Production Smoke` workflow can generate the same Markdown release record
  when `release_tag`, `rollback_target`, and `visual_artifact_name` inputs are
  provided. When `allow_blocked_release_notes=true`, the same step passes
  `--allow-blocked`; the uploaded notes are marked `Mode: failure review draft`
  with a warning that they are not release sign-off.

## Failure Review

- Download the workflow artifact or open the checked-out report path.
- Run `pnpm smoke:report -- artifacts/production-smoke/smoke-report.json`.
- Run `pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json`
  before marking release evidence ready.
- Run `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json`
  before marking the combined production and visual evidence ready.
- Add `--visual-artifact-dir reports/visual/page-builder-fixture` when the
  release depends on screenshots from a downloaded Page Builder Visual artifact.
- Run the same command with `--checklist` when the gate is blocked and keep the
  readiness task output with the failed evidence review.
- Use the failed check details and suggested fixes from the report review; the
  combined release gate blockers include the Production Smoke artifact action
  and the `pnpm visual:acceptance -- --checklist` command for visual evidence.
- Link both the failed run and the fixed run in the release notes.
- Do not mark the release ready until a new artifact proves the failed gate is
  fixed.

## After Release

- Keep the smoke report artifact for at least the workflow retention window.
- Keep the combined release evidence artifact for at least the workflow
  retention window.
- Keep the generated release notes artifact for at least the workflow retention
  window when it was produced by `Production Smoke`.
- Record the release tag, workflow run URL, smoke artifact name, combined release
  artifact name, production smoke source run, public storefront URL, and rollback
  target in the release notes.
- Keep the generated `docs/releases/<tag>.md` release record with the release
  evidence bundle.
- If a P0 or P1 issue happens, attach the failed smoke report review to the
  incident recap and add the missing test, monitor, or runbook update.
