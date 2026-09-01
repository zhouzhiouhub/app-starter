import {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-manifest-path.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";

const requiredProductionSmokeArtifacts = [
  "production-smoke-report-<run_number>",
  "release-preflight-<run_number>",
  "release-evidence-check-<run_number>",
  "project-status-<run_number>",
];

const productionSmokeEvidenceActionPrefix = [
  "Run pnpm smoke:request, validate the filled workflow_dispatch inputs",
  `with pnpm smoke:dispatch -- --inputs-json ${defaultProductionSmokeDispatchInputsManifestOutputPath} --require-complete, then run the`,
  "Production Smoke workflow against the production environment",
].join(" ");

export function createMissingSmokeArtifactAction(error, smokeReportPath) {
  const cause = readMissingSmokeArtifactCause(error);
  const artifacts = requiredProductionSmokeArtifacts.join(", ");

  if (smokeReportPath) {
    return [
      productionSmokeEvidenceActionPrefix,
      `and keep the ${artifacts} artifacts, or place its smoke-report.json`,
      `at ${smokeReportPath}; then rerun pnpm release:check -- --smoke-report`,
      `${smokeReportPath}. Cause: ${cause}`,
    ].join(" ");
  }

  return [
    productionSmokeEvidenceActionPrefix,
    `and keep the ${artifacts} artifacts, or pass --smoke-report <path>`,
    "to an archived report; then rerun pnpm release:check.",
    `Cause: ${cause}`,
  ].join(" ");
}

function readMissingSmokeArtifactCause(error) {
  const cause = readErrorMessage(error);

  if (cause.startsWith("No smoke reports found.")) {
    return "No smoke reports found.";
  }

  return cause;
}
