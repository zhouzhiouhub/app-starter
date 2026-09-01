export function printReleaseRequestsHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:requests
  pnpm release:requests -- --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 456
  pnpm release:requests -- --release-output tmp/release.md --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --visual-table-output tmp/reference-table.tsv --smoke-output tmp/smoke.md --smoke-inputs-output tmp/smoke-inputs.txt --smoke-inputs-table-output tmp/smoke-inputs.tsv

Outputs:
  --release-output <path>  Combined release evidence request Markdown.
  --visual-output <path>   Page Builder design reference request Markdown.
  --visual-missing-output <path>
                           Plain text missing Page Builder reference paths.
  --visual-table-output <path>
                           TSV Page Builder reference export task table.
  --smoke-output <path>    Production Smoke request Markdown.
  --smoke-inputs-output <path>
                           Plain text Production Smoke workflow_dispatch inputs.
  --smoke-inputs-table-output <path>
                           TSV Production Smoke workflow_dispatch input table.

Shared evidence inputs:
  --source-dir <dir> or --visual-source-dir <dir>
  --manifest <path> or --visual-manifest <path>
  --smoke-report <path>
  --visual-artifact-dir <dir>
  Production Smoke inputs accepted by pnpm smoke:request, including
  --visual-artifact, --visual-artifact-run-id,
  --local-verification-run-url, --local-verification-artifact,
  --release-tag, --rollback-target, and --storefront-url.

Evidence:
  This command refreshes all local evidence request files, the missing Page
  Builder reference path list, the reference export task table, and the
  Production Smoke workflow input template and TSV input table for blocked
  release handoff.
  Custom output paths are also reflected in the
  combined release evidence request refresh command, output summary, and
  embedded request commands. It does not import visual references, run
  Production Smoke, create release notes, upload artifacts, or mark the project
  ready.`);
}
