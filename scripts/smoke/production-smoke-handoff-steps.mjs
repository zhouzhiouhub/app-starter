import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchValidationCommand,
  createProductionSmokeManualDispatchInstruction,
} from "./production-smoke-dispatch-command.mjs";

const productionSmokeArtifactNames = [
  "production-smoke-report-<run_number>",
  "release-preflight-<run_number>",
  "release-evidence-check-<run_number>",
  "project-status-<run_number>",
];

const productionSmokeLocalVerificationInputs = [
  "local_verification_run_url=<main CI run URL>",
  "local_verification_artifact_name=local-verification-<run_number>",
];

const productionSmokeReleaseNoteInputs = [
  "release_tag=<tag>",
  "rollback_target=<target>",
  "storefront_url=<public HTTPS storefront URL>",
];

const productionSmokeVisualInputs = [
  "visual_artifact_name=page-builder-visual-fixture-<run_number>",
  "visual_artifact_run_id=<Page Builder Visual workflow run id>",
];

const productionSmokeDispatchCommand = createProductionSmokeDispatchCommand();
const productionSmokeDispatchValidationCommand =
  createProductionSmokeDispatchValidationCommand();
const productionSmokeManualDispatch =
  createProductionSmokeManualDispatchInstruction();

export function createProductionSmokeHandoffSteps(options = {}) {
  const steps = [
    ...(options.includeRunWorkflow
      ? [
          createHandoffStep(
            "Run workflow",
            "GitHub Actions Production Smoke against the production environment",
          ),
        ]
      : []),
    createHandoffStep("Manual dispatch", productionSmokeManualDispatch),
    createHandoffStep(
      "Validate dispatch",
      productionSmokeDispatchValidationCommand,
    ),
    createHandoffStep("Dispatch template", productionSmokeDispatchCommand),
    createHandoffStep(
      "Local verification inputs",
      productionSmokeLocalVerificationInputs.join(", "),
    ),
    createHandoffStep("Visual evidence inputs", productionSmokeVisualInputs.join(", ")),
    createHandoffStep(
      "Release note inputs",
      productionSmokeReleaseNoteInputs.join(", "),
    ),
    createHandoffStep("Keep artifacts", productionSmokeArtifactNames.join(", ")),
    createHandoffStep("Rerun gate", options.rerunGateCommand),
  ];

  return steps.filter((step) => step.value);
}

function createHandoffStep(label, value) {
  return {
    label,
    value,
  };
}
