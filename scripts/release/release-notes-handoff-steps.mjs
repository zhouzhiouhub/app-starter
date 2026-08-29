const releaseNotesArtifactName = "release-notes-<run_number>";
const releaseNotesOutputPath = "docs/releases/<tag>.md";

export function createReleaseNotesHandoffSteps() {
  return [
    createStep(
      "Command",
      `pnpm release:notes -- --release-tag <tag> --workflow-run-url <url> --output ${releaseNotesOutputPath}`,
    ),
    createStep(
      "Evidence args",
      [
        "--smoke-artifact production-smoke-report-<run_number>",
        "--preflight-artifact release-preflight-<run_number>",
        "--release-artifact release-evidence-check-<run_number>",
        "--project-status artifacts/release/project-status.json",
        "--project-status-artifact project-status-<run_number>",
        "--visual-artifact page-builder-visual-fixture-<run_number>",
      ].join(" "),
    ),
    createStep(
      "Review args",
      "--storefront-url <url> --rollback-target <target>",
    ),
    createStep(
      "Input evidence",
      "artifacts/release/release-check.json, artifacts/release/project-status.json",
    ),
    createStep("Output", releaseNotesOutputPath),
    createStep("Keep artifact", releaseNotesArtifactName),
    createStep(
      "Formal mode",
      "Run without --allow-blocked after release evidence is ready",
    ),
  ];
}

function createStep(label, value) {
  return { label, value };
}
