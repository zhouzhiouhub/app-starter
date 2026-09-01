export function printProductionSmokeRequestHelp(writeLine) {
  writeLine(`Usage:
  pnpm smoke:request
  pnpm smoke:request -- --output artifacts/production-smoke/production-smoke-request.md
  pnpm smoke:request -- --inputs-output artifacts/production-smoke/production-smoke-dispatch-inputs.txt
  pnpm smoke:request -- --inputs-table-output artifacts/production-smoke/production-smoke-dispatch-inputs.tsv
  pnpm smoke:request -- --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 456

Options:
  --output <path>              Write the production smoke evidence request Markdown.
  --inputs-output <path>       Write a plain text workflow_dispatch input template.
  --inputs-table-output <path> Write a TSV workflow_dispatch input handoff table.

Evidence inputs:
  Accepts the same evidence input overrides as pnpm smoke:dispatch, including
  --visual-artifact, --visual-artifact-run-id, --local-verification-run-url,
  --local-verification-artifact, --release-tag, --rollback-target, and
  --storefront-url.

Evidence:
  This command writes a production handoff request only. The terminal summary
  and Markdown status report dispatch readiness and any missing input names. It
  can also write a plain text workflow_dispatch input template and a TSV input
  table. It does not run smoke checks, create release evidence, upload
  artifacts, or mark the project ready.`);
}
