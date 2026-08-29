import { normalizeArtifactName } from "./release-notes-validation.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";

const defaultSmokeReportPath = "artifacts/production-smoke/smoke-report.json";
const defaultReleaseCheckArtifactPath = "artifacts/release/release-check.json";
const defaultProjectStatusArtifactPath = "artifacts/release/project-status.json";
const defaultSmokeReportArtifactName = "production-smoke-report-local";
const defaultReleaseCheckArtifactName = "release-evidence-check-local";
const defaultProjectStatusArtifactName = "project-status-local";
const defaultReleaseNotesArtifactName = "release-notes-local";

export function validateProductionSmokeWorkflowArtifacts(env) {
  validateWorkflowArtifactPaths(env);
  validateWorkflowArtifactNames(env);
}

function validateWorkflowArtifactPaths(env) {
  normalizeSmokeReportPath(
    readWorkflowEnv(env, "SMOKE_REPORT_PATH", defaultSmokeReportPath),
  );
  normalizeJsonArtifactPath(
    "Release check artifact",
    readWorkflowEnv(
      env,
      "RELEASE_CHECK_ARTIFACT_PATH",
      defaultReleaseCheckArtifactPath,
    ),
  );
  normalizeJsonArtifactPath(
    "Project status artifact",
    readWorkflowEnv(
      env,
      "PROJECT_STATUS_ARTIFACT_PATH",
      defaultProjectStatusArtifactPath,
    ),
  );
}

function validateWorkflowArtifactNames(env) {
  normalizeArtifactName(
    "smoke report artifact",
    readWorkflowEnv(
      env,
      "SMOKE_REPORT_ARTIFACT_NAME",
      defaultSmokeReportArtifactName,
    ),
  );
  normalizeArtifactName(
    "release check artifact",
    readWorkflowEnv(
      env,
      "RELEASE_CHECK_ARTIFACT_NAME",
      defaultReleaseCheckArtifactName,
    ),
  );
  normalizeArtifactName(
    "project status artifact",
    readWorkflowEnv(
      env,
      "PROJECT_STATUS_ARTIFACT_NAME",
      defaultProjectStatusArtifactName,
    ),
  );
  normalizeArtifactName(
    "release notes artifact",
    readWorkflowEnv(
      env,
      "RELEASE_NOTES_ARTIFACT_NAME",
      defaultReleaseNotesArtifactName,
    ),
  );
}

function normalizeJsonArtifactPath(label, value) {
  try {
    return normalizeSmokeReportPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll("SMOKE_REPORT_PATH", label),
    );
  }
}

function readWorkflowEnv(env, name, fallback) {
  if (!Object.hasOwn(env, name)) {
    return fallback;
  }

  return env[name];
}
