export function printReleaseRequestsHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:requests
  pnpm release:requests -- --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 456
  pnpm release:requests -- --release-output tmp/release.md --requests-manifest-output tmp/release-requests-manifest.json --project-status-output tmp/project-status.json --project-status-markdown tmp/project-status.md --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --visual-table-output tmp/reference-table.tsv --visual-json-output tmp/reference-manifest.json --visual-handoff-output tmp/visual-handoff --smoke-output tmp/smoke.md --smoke-inputs-output tmp/smoke-inputs.txt --smoke-inputs-table-output tmp/smoke-inputs.tsv --smoke-inputs-json-output tmp/smoke-inputs.json

Outputs:
  --release-output <path>  Combined release evidence request Markdown.
  --requests-manifest-output <path>
                           JSON release:requests bundle manifest.
  --project-status-output <path>
                           Project Status JSON handoff.
  --project-status-markdown <path>
                           Project Status Markdown handoff.
  --visual-output <path>   Page Builder design reference request Markdown.
  --visual-missing-output <path>
                           Plain text missing Page Builder reference paths.
  --visual-table-output <path>
                           TSV Page Builder reference export task table.
  --visual-json-output <path>
                           JSON Page Builder reference export manifest.
  --visual-handoff-output <dir>
                           Page Builder design handoff package directory.
  --smoke-output <path>    Production Smoke request Markdown.
  --smoke-inputs-output <path>
                           Plain text Production Smoke workflow_dispatch inputs.
  --smoke-inputs-table-output <path>
                           TSV Production Smoke workflow_dispatch input table.
  --smoke-inputs-json-output <path>
                           JSON Production Smoke workflow_dispatch input manifest.

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
  Builder reference path list, the reference export task table and JSON manifest,
  the visual reference handoff package, the release:requests bundle manifest,
  the Project Status JSON and Markdown handoff, and the Production Smoke
  workflow input template, TSV input table, and JSON input manifest for blocked
  release handoff.
  Custom output paths are also reflected in the
  combined release evidence request refresh command, output summary, and
  embedded request commands. Its terminal summary reports the first missing
  visual reference, missing reason, matching preview screenshot, and first missing
  Production Smoke input replacement reason when evidence inputs still contain placeholders.
  It does not import visual references, run Production Smoke, create release
  notes, upload artifacts, or mark the project ready.`);
}
