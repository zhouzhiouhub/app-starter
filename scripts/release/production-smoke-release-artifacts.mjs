import {
  normalizeArtifactName,
  normalizeProjectStatusMarkdownPath,
  normalizeReleaseCheckMarkdownPath,
  normalizeReleaseNotesOutputPath,
} from "./release-notes-validation.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import {
  normalizeSmokeReportMarkdownPath,
  normalizeSmokeReportPath,
} from "../smoke/smoke-report-path-config.mjs";

const defaultSmokeReportPath = "artifacts/production-smoke/smoke-report.json";
const defaultSmokeReportMarkdownPath =
  "artifacts/production-smoke/smoke-report.md";
const defaultReleaseCheckArtifactPath = "artifacts/release/release-check.json";
const defaultReleaseCheckMarkdownPath = "artifacts/release/release-check.md";
const defaultProjectStatusArtifactPath =
  "artifacts/release/project-status.json";
const defaultProjectStatusMarkdownPath = "artifacts/release/project-status.md";
const defaultReleaseNotesPath = "artifacts/release/release-notes.md";
const defaultSmokeReportArtifactName = "production-smoke-report-local";
const defaultReleaseCheckArtifactName = "release-evidence-check-local";
const defaultProjectStatusArtifactName = "project-status-local";
const defaultReleaseNotesArtifactName = "release-notes-local";
const defaultReleasePreflightArtifactName = "release-preflight-local";

export function validateProductionSmokeWorkflowArtifacts(env) {
  validateWorkflowArtifactPaths(env);
  validateWorkflowArtifactNames(env);
}

function validateWorkflowArtifactPaths(env) {
  normalizeSmokeReportPath(
    readWorkflowEnv(env, "SMOKE_REPORT_PATH", defaultSmokeReportPath),
  );
  normalizeSmokeReportMarkdownPath(
    readWorkflowEnv(
      env,
      "SMOKE_REPORT_MARKDOWN_PATH",
      defaultSmokeReportMarkdownPath,
    ),
  );
  normalizeJsonArtifactPath(
    "Release check artifact",
    readWorkflowEnv(
      env,
      "RELEASE_CHECK_ARTIFACT_PATH",
      defaultReleaseCheckArtifactPath,
    ),
  );
  normalizeReleaseCheckMarkdownPath(
    readWorkflowEnv(
      env,
      "RELEASE_CHECK_MARKDOWN_PATH",
      defaultReleaseCheckMarkdownPath,
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
  normalizeProjectStatusMarkdownPath(
    readWorkflowEnv(
      env,
      "PROJECT_STATUS_MARKDOWN_PATH",
      defaultProjectStatusMarkdownPath,
    ),
  );
  normalizeReleaseNotesOutputPath(
    readWorkflowEnv(env, "RELEASE_NOTES_PATH", defaultReleaseNotesPath),
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
  normalizeArtifactName(
    "release preflight artifact",
    readWorkflowEnv(
      env,
      "RELEASE_PREFLIGHT_ARTIFACT_NAME",
      defaultReleasePreflightArtifactName,
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
