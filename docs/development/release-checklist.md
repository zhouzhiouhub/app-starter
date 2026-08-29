# Release Checklist

Use this checklist for production release evidence. It keeps the MVP boundary
intact: Commerce and non-default Locale publishing stay disabled until their
later phases are explicitly approved.

## Before Production Smoke

- Review [`infra/README.md`](../../infra/README.md) for the production
  deployment sequence, environment variable matrix, evidence flow, and rollback
  runbook.
- Configure the GitHub `production` environment with the required smoke secrets:
  `PRODUCTION_API_URL`, `PRODUCTION_WEB_URL`, `PRODUCTION_ADMIN_URL`,
  `PRODUCTION_DATABASE_URL`, `PRODUCTION_REDIS_URL`,
  `PRODUCTION_SMOKE_ADMIN_EMAIL`, `PRODUCTION_SMOKE_ADMIN_PASSWORD`,
  `PRODUCTION_R2_ACCOUNT_ID`, `PRODUCTION_R2_ACCESS_KEY_ID`,
  `PRODUCTION_R2_SECRET_ACCESS_KEY`, `PRODUCTION_R2_BUCKET`,
  `PRODUCTION_PREVIEW_TOKEN_SECRET`, `PRODUCTION_JWT_PRIVATE_KEY`,
  `PRODUCTION_JWT_PUBLIC_KEY`, `PRODUCTION_STOREFRONT_REVALIDATE_SECRET`, and
  `PRODUCTION_STOREFRONT_REVALIDATE_URL`.
- Configure optional production secrets only when they are intentionally used:
  `PRODUCTION_PREVIEW_TOKEN_PREVIOUS_SECRET` during preview-token rotation, and
  `PRODUCTION_STRIPE_SECRET_KEY` plus `PRODUCTION_STRIPE_WEBHOOK_SECRET` should
  remain empty unless Phase 2 Commerce is explicitly enabled.
- Configure the GitHub `production` environment vars used by the smoke runner:
  `PRODUCTION_MEDIA_CDN_BASE_URL`, `PRODUCTION_R2_REGION`,
  `PRODUCTION_MEDIA_EXTERNAL_URL_HOSTS`, `PRODUCTION_ANALYTICS_ENABLED`,
  `PRODUCTION_ANALYTICS_CONSENT_GRANTED`, `PRODUCTION_GTM_CONTAINER_ID`,
  `PRODUCTION_GA4_MEASUREMENT_ID`, and `PRODUCTION_CLARITY_PROJECT_ID`.
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
- Run `pnpm visual:acceptance -- --checklist --markdown-output reports/visual/page-builder-fixture/visual-acceptance-report.md reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`
  and keep the manifest review output plus per-viewport evidence task list
  with the release notes. The
  checklist names the expected reference PNG, retained screenshot path, and
  import/capture/measure/accept-passing/verify commands for each Desktop and
  Mobile viewport.
  After
  placing real design reference PNGs under a retained source directory, run
  `pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete`
  to keep the reference intake report with missing or imported PNG paths. Then
  run
  `pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`.
  Then run
  `pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest`
  to refresh retained screenshots against the same artifact-local manifest.
  Then run
  `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`
  to calculate the viewport metrics. After design review passes, run
  `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete`
  to mark passing viewport evidence accepted. For final MVP sign-off, rerun
  `pnpm visual:acceptance -- --require-accepted reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`;
  accepted screenshots must be retained under
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
  local build/start/capture/stop workflow. Run
  `pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture`
  when you need the complete uploadable fixture bundle with manifest, capture
  report, reference import Markdown, acceptance report, and artifact check.
  Keep the flag disabled outside the capture session.
- Run the `Page Builder Visual` GitHub Actions workflow and keep its
  `page-builder-visual-fixture-<run_number>` artifact with the release notes.
  This artifact includes `visual-acceptance-report.json` for structured review
  status and proves fixture capture regression only; final visual sign-off still
  requires accepted real design evidence.
- Before running smoke requests, the `Production Smoke` workflow preflights
  artifact output paths, optional smoke runtime inputs, and optional release
  evidence inputs with
  `pnpm release:preflight`: `SMOKE_REPORT_PATH`,
  `RELEASE_CHECK_ARTIFACT_PATH`, and `PROJECT_STATUS_ARTIFACT_PATH` must be
  safe repository-relative JSON paths; `SMOKE_REPORT_MARKDOWN_PATH`,
  `RELEASE_CHECK_MARKDOWN_PATH`, `PROJECT_STATUS_MARKDOWN_PATH`, and
  `RELEASE_NOTES_PATH` must be safe repository-relative Markdown paths;
  `SMOKE_REPORT_ARTIFACT_NAME`,
  `RELEASE_CHECK_ARTIFACT_NAME`, `PROJECT_STATUS_ARTIFACT_NAME`,
  `RELEASE_NOTES_ARTIFACT_NAME`, and `RELEASE_PREFLIGHT_ARTIFACT_NAME` must be
  safe artifact names;
  `SMOKE_STOREFRONT_HOST` must be a safe host when set;
  `SMOKE_REQUIRE_ADMIN_APP`, `SMOKE_REQUIRE_R2_UPLOAD`, and
  `SMOKE_REQUIRE_REVALIDATION` must be `true` or `false` when set;
  `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`, `SMOKE_TENANT_SLUG`,
  `SMOKE_LOCALE`, `SMOKE_MARKET`, `SMOKE_PAGE_SLUG`,
  `SMOKE_RETRY_ATTEMPTS`, and `SMOKE_RETRY_DELAY_MS` must match
  `smoke:publish` input constraints when set;
  when `NODE_ENV`, `APP_ENV`, or `VERCEL_ENV` is `production`, the same
  preflight also fails before smoke requests if production API/Web/Admin URLs,
  `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`, `DATABASE_URL`, `REDIS_URL`, MVP
  disabled feature flags, JWT keys, R2/CDN, Preview Token secret, ISR
  revalidation, `SMOKE_REPORT_PATH`, or required smoke gates are not
  production-ready; the failure output includes a bounded blocker and next
  action summary for the workflow log; the workflow writes
  `artifacts/release/preflight.json` and `artifacts/release/preflight.md` and
  uploads them as `release-preflight-<run_number>` so a failed preflight still
  has retained evidence;
  `visual_artifact_name` and
  `visual_artifact_run_id` must be provided together, and release notes require
  `release_tag`, `rollback_target`, `visual_artifact_name`, and
  `visual_artifact_run_id` together; release notes also require
  `RELEASE_PREFLIGHT_ARTIFACT_NAME`.
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
   `rollback_target`, `visual_artifact_name`, `visual_artifact_run_id`, and
   optionally `storefront_url` plus `release_notes_path`.
8. Keep `allow_blocked_release_notes` disabled for release sign-off. Enable it
   only when the run is expected to fail and you need a `--allow-blocked`
   failure review draft attached to the artifacts.

## Required Evidence

- The `Production Smoke` workflow run is linked from the release notes.
- The uploaded artifact `production-smoke-report-<run_number>` is attached or
  linked. It contains both `smoke-report.json` and the Markdown review
  `smoke-report.md`.
- The uploaded artifact `release-preflight-<run_number>` is attached or linked.
  It contains both `preflight.json` and `preflight.md`.
- The uploaded artifact `release-evidence-check-<run_number>` is attached or
  linked. It contains both `release-check.json` and the Markdown review
  `release-check.md`.
- The uploaded artifact `project-status-<run_number>` is attached or linked.
  It contains both `project-status.json` and the Markdown handoff checklist
  `project-status.md`; the Markdown handoff lists the release evidence artifact
  paths and refresh commands used for review.
- When release note inputs were provided, the uploaded artifact
  `release-notes-<run_number>` is attached or linked.
- The GitHub step summary records the report path, artifact names, review
  command, source commit, source workflow run URL, and
  `release:handoff -- --require-ready` command with
  `--release-check-markdown artifacts/release/release-check.md` and
  `--project-status-markdown artifacts/release/project-status.md` so blocked
  runs keep every pending Page Builder visual viewport task and command line in
  the Markdown artifacts.
  When visual evidence is downloaded, that handoff command includes
  `--visual-artifact-dir reports/visual/page-builder-fixture`.
- The GitHub step summary records the `project-status-<run_number>` artifact
  name for release handoff.
- `pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json`
  output is saved in the workflow log, and `smoke-report.md` is uploaded with
  the smoke artifact.
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
- The reference intake report
  `reports/visual/page-builder-fixture/visual-reference-import-report.md` is
  retained when real design PNGs were imported for the release review.
- The latest `Page Builder Visual` workflow run and
  `page-builder-visual-fixture-<run_number>` artifact are linked when visual
  evidence is part of the release review; the artifact contains
  `page-builder-visual-acceptance.json` with artifact-local screenshot paths,
  `visual-capture-report.json` with the captured screenshot list, and
  `visual-reference-import-report.md` with reference intake status,
  `visual-acceptance-report.json` with the structured acceptance status,
  `visual-acceptance-report.md`, and `visual-artifact-check-report.md`.
- When `visual_artifact_run_id` was provided, the Production Smoke workflow log
  shows the Page Builder Visual artifact download before the combined release
  gate.
- When `visual_artifact_run_id` was provided, the Production Smoke workflow log
  shows
  `pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md`
  passing after the download and before smoke requests continue. The check
  confirms the reference import Markdown and visual acceptance Markdown belong
  to the artifact-local manifest.
- When `visual_artifact_run_id` was provided, the Production Smoke workflow
  summary lists
  `reports/visual/page-builder-fixture/visual-reference-import-report.md` beside
  the visual artifact check report, so release review can trace which real
  reference PNGs were imported or still missing.
- Local reproduction of the same uploaded visual artifact shape uses
  `pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture`.
- `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json`
  exits successfully after the production smoke artifact and accepted Page
  Builder visual manifest are both present.
- When `visual_artifact_run_id` was provided,
  `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture`
  exits successfully and records `visual.artifactCheck.status=complete`.
- `pnpm release:check -- --checklist --smoke-report artifacts/production-smoke/smoke-report.json`
  prints the Production Smoke, Page Builder Visual, and release notes readiness
  tasks for release review, including the first Page Builder visual viewport
  tasks with their expected evidence paths and commands. Add
  `--all-visual-tasks` when the release review needs every pending Page Builder
  visual viewport task and full command line in the same output.
- `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --output artifacts/release/release-check.json --markdown-output artifacts/release/release-check.md`
  writes the combined `release-evidence-check.v1` artifact and matching
  Markdown review for the release record; its `readinessChecklist` lists the
  Production Smoke, Page Builder visual, and release notes tasks, while
  `visual.pendingComponents`,
  `visual.pendingViewports`, `visual.issues`, and
  `visual.checklist.pendingTasks` identify any remaining Page Builder visual
  evidence gaps and their per-viewport commands when the gate is blocked. When
  `--visual-artifact-dir` is provided, the same artifact includes
  `visual.artifactCheck` with required file, validated screenshot, and issue
  counts.
- `pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture`
  writes the preflight JSON/Markdown, combined release evidence JSON/Markdown,
  and project status JSON/Markdown from the same handoff run. The terminal
  summary prints the first two next actions with structured steps when
  available, previews the first hidden structured action only when the visible
  actions do not have steps, and points any remaining work to `project-status.md`.
  It is safe for blocked review handoff because it still writes the files; add
  `--require-ready` when it should fail until release evidence and preflight are
  ready.
- The `Production Smoke` workflow uploads the same combined release evidence as
  `release-evidence-check-<run_number>`; the artifact includes
  `release-check.json`, `release-check.md`, and `smoke.source` so release notes
  can trace the smoke report back to the CI run.
- The `Production Smoke` workflow uploads `project-status-<run_number>`; the
  artifact is a validated `project-status.v1` snapshot with the full
  `--all-actions` next-action list, untruncated command lines, and
  `project-status.md` handoff checklist, including the production smoke,
  visual bundle, reference import Markdown, artifact check Markdown, combined
  gate, project status, and release notes artifact map. Once the gate is ready,
  the next-action list reduces to the structured `release:notes` handoff:
  command, evidence args, review args, input evidence, output record,
  `release-notes-<run_number>` artifact, and formal mode without
  `--allow-blocked`.
- Production Smoke artifact uploads use `if-no-files-found: error`; missing
  preflight JSON/Markdown, smoke JSON, Smoke Markdown, combined gate
  JSON/Markdown, project status, or release notes files fail the workflow
  instead of leaving only a warning.
- `pnpm release:notes -- --release-tag <tag> --workflow-run-url <url> --smoke-artifact production-smoke-report-<run_number> --preflight-artifact release-preflight-<run_number> --release-artifact release-evidence-check-<run_number> --project-status artifacts/release/project-status.json --project-status-artifact project-status-<run_number> --visual-artifact page-builder-visual-fixture-<run_number> --storefront-url <url> --rollback-target <target> --output docs/releases/<tag>.md`
  writes the final Markdown release record from the ready
  `release-evidence-check.v1` artifact, including the readiness checklist,
  preflight artifact, project status artifact and source path, visual manifest
  path, optional `visual.artifactCheck` summary, pending visual evidence lists,
  visual checklist task summary, and visual issue summary when `--allow-blocked`
  is used for failure review drafts. Blocked drafts also include a
  `Project Next Actions` section from the validated `project-status.v1` file so
  the first production smoke and visual evidence repair steps stay with the
  failed review record. The command validates the artifact's smoke
  summary, source metadata, `--workflow-run-url` match, smoke artifact,
  preflight artifact, and project status artifact run-number match,
  `project-status.v1` release-ready and gate-count consistency, traceability
  groups, readiness checklist, visual counts, optional
  visual artifact check, pending lists, and issue entries before writing the
  Markdown record; a ready artifact must also have no blockers, internally
  consistent smoke status, ready production smoke with source metadata, fully
  accepted visual evidence with no pending or issue entries, and any recorded
  visual artifact check must be complete.
- The `Production Smoke` workflow can generate the same Markdown release record
  when `release_tag`, `rollback_target`, `visual_artifact_name`, and
  `visual_artifact_run_id` inputs are provided. When
  `allow_blocked_release_notes=true`, the same step passes
  `--allow-blocked`; the uploaded notes are marked `Mode: failure review draft`
  with a warning that they are not release sign-off.

## Failure Review

- Download the workflow artifact or open the checked-out report path.
- Run `pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json`.
- Run `pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json`
  before marking release evidence ready.
- Run
  `pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --markdown-output artifacts/release/release-check.md`
  before marking the combined production and visual evidence ready.
- Add `--visual-artifact-dir reports/visual/page-builder-fixture` when the
  release depends on screenshots from a downloaded Page Builder Visual artifact.
- Run
  `pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture`
  when a blocked or ready review needs both release evidence and project status
  JSON/Markdown files refreshed together.
- Run `pnpm release:check -- --checklist` when the gate is blocked and keep
  the readiness task output with the failed evidence review.
- Use the failed check details and suggested fixes from the report review; the
  combined release gate blockers include the Production Smoke artifact action
  and the `pnpm visual:acceptance -- --checklist` command for visual evidence.
- Link both the failed run and the fixed run in the release notes.
- Keep the `Project Next Actions` section from any blocked release notes draft
  with the failed run so the production smoke and visual evidence repair steps
  are visible without reopening the JSON artifact.
- Do not mark the release ready until a new artifact proves the failed gate is
  fixed.

## After Release

- Keep the smoke report artifact for at least the workflow retention window.
- Keep the combined release evidence artifact for at least the workflow
  retention window.
- Keep the project status artifact for at least the workflow retention window.
- Keep the generated release notes artifact for at least the workflow retention
  window when it was produced by `Production Smoke`.
- Record the release tag, workflow run URL, smoke artifact name, preflight
  artifact name, combined release artifact name, project status artifact name,
  production smoke source run, public storefront URL, and rollback target in the
  release notes.
- Keep the generated `docs/releases/<tag>.md` release record with the release
  evidence bundle.
- If a P0 or P1 issue happens, attach the failed smoke report review to the
  incident recap and add the missing test, monitor, or runbook update.
