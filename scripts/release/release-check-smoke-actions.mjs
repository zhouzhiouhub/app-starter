import { readErrorMessage } from "../smoke/smoke-error-message.mjs";

const requiredProductionSmokeArtifacts = [
  "production-smoke-report-<run_number>",
  "release-preflight-<run_number>",
  "release-evidence-check-<run_number>",
  "project-status-<run_number>",
];

export function createMissingSmokeArtifactAction(error, smokeReportPath) {
  const cause = readMissingSmokeArtifactCause(error);
  const artifacts = requiredProductionSmokeArtifacts.join(", ");

  if (smokeReportPath) {
    return [
      "Run the Production Smoke workflow against the production environment",
      `and keep the ${artifacts} artifacts, or place its smoke-report.json`,
      `at ${smokeReportPath}; then rerun pnpm release:check -- --smoke-report`,
      `${smokeReportPath}. Cause: ${cause}`,
    ].join(" ");
  }

  return [
    "Run the Production Smoke workflow against the production environment",
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
