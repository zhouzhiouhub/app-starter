export function printProductionSmokeDispatchHelp(writeLine) {
  writeLine(`Usage:
  pnpm smoke:dispatch
  pnpm smoke:dispatch -- --json
  pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json
  pnpm smoke:dispatch -- --require-complete
  pnpm smoke:dispatch -- --local-verification-run-url https://github.com/owner/repo/actions/runs/122 --local-verification-artifact local-verification-122 --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 123 --release-tag v0.1.0 --rollback-target main@abcdef1 --storefront-url https://store.brand.com

Options:
  --json                              Print machine-readable dispatch data.
  --require-complete                  Fail if any workflow input still uses a placeholder.
  --inputs-json <path>                Read workflow_dispatch values from the JSON input manifest.
  --inputs-manifest <path>            Alias for --inputs-json.
  --ref <ref>                         Git ref for the workflow dispatch; defaults to main.
  --workflow-file <file>              Workflow file name; defaults to production-smoke.yml.
  --local-verification-run-url <url>  Main CI GitHub Actions run URL.
  --local-verification-artifact <name>
                                      Main CI local-verification artifact name.
  --visual-artifact <name>            Page Builder Visual artifact name.
  --visual-artifact-run-id <id>       Page Builder Visual workflow run id.
  --release-tag <tag>                 Release tag used by release notes.
  --rollback-target <target>          Commit, tag, deployment, or version used for rollback.
  --storefront-url <url>              Public production storefront URL.
  -h, --help                          Show this help.

Dispatch:
  This command only prints the GitHub Actions dispatch command and manual UI
  path. It does not call gh, run Production Smoke, or mark release evidence
  ready. Use --require-complete before copying a formal release command so
  placeholder values cannot reach the protected production workflow. When
  --inputs-json is used, explicit CLI flags win over values read from the JSON
  input manifest.`);
}
