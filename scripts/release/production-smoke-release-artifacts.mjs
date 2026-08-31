import {
  normalizeArtifactName,
  normalizeLocalVerificationArtifactName,
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
const defaultLocalVerificationArtifactName = "";

export function validateProductionSmokeWorkflowArtifacts(env) {
  validateWorkflowArtifactPaths(env);
  validateWorkflowArtifactNames(env);
}

export function createProductionSmokeWorkflowArtifactsSummary(env) {
  return {
    artifactNames: readWorkflowArtifactNames(env),
    paths: readWorkflowArtifactPaths(env),
  };
}

function validateWorkflowArtifactPaths(env) {
  readWorkflowArtifactPaths(env);
}

function validateWorkflowArtifactNames(env) {
  readWorkflowArtifactNames(env);
}

function readWorkflowArtifactPaths(env) {
  return {
    projectStatusJson: normalizeJsonArtifactPath(
      "Project status artifact",
      readWorkflowEnv(
        env,
        "PROJECT_STATUS_ARTIFACT_PATH",
        defaultProjectStatusArtifactPath,
      ),
    ),
    projectStatusMarkdown: normalizeProjectStatusMarkdownPath(
      readWorkflowEnv(
        env,
        "PROJECT_STATUS_MARKDOWN_PATH",
        defaultProjectStatusMarkdownPath,
      ),
    ),
    releaseCheckJson: normalizeJsonArtifactPath(
      "Release check artifact",
      readWorkflowEnv(
        env,
        "RELEASE_CHECK_ARTIFACT_PATH",
        defaultReleaseCheckArtifactPath,
      ),
    ),
    releaseCheckMarkdown: normalizeReleaseCheckMarkdownPath(
      readWorkflowEnv(
        env,
        "RELEASE_CHECK_MARKDOWN_PATH",
        defaultReleaseCheckMarkdownPath,
      ),
    ),
    releaseNotesMarkdown: normalizeReleaseNotesOutputPath(
      readWorkflowEnv(env, "RELEASE_NOTES_PATH", defaultReleaseNotesPath),
    ),
    smokeReportJson: normalizeSmokeReportPath(
      readWorkflowEnv(env, "SMOKE_REPORT_PATH", defaultSmokeReportPath),
    ),
    smokeReportMarkdown: normalizeSmokeReportMarkdownPath(
      readWorkflowEnv(
        env,
        "SMOKE_REPORT_MARKDOWN_PATH",
        defaultSmokeReportMarkdownPath,
      ),
    ),
  };
}

function readWorkflowArtifactNames(env) {
  const localVerificationArtifactName = readWorkflowEnv(
    env,
    "RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME",
    defaultLocalVerificationArtifactName,
  );

  return {
    localVerification: localVerificationArtifactName
      ? normalizeLocalVerificationArtifactName(localVerificationArtifactName)
      : null,
    projectStatus: normalizeArtifactName(
      "project status artifact",
      readWorkflowEnv(
        env,
        "PROJECT_STATUS_ARTIFACT_NAME",
        defaultProjectStatusArtifactName,
      ),
    ),
    releaseCheck: normalizeArtifactName(
      "release check artifact",
      readWorkflowEnv(
        env,
        "RELEASE_CHECK_ARTIFACT_NAME",
        defaultReleaseCheckArtifactName,
      ),
    ),
    releaseNotes: normalizeArtifactName(
      "release notes artifact",
      readWorkflowEnv(
        env,
        "RELEASE_NOTES_ARTIFACT_NAME",
        defaultReleaseNotesArtifactName,
      ),
    ),
    releasePreflight: normalizeArtifactName(
      "release preflight artifact",
      readWorkflowEnv(
        env,
        "RELEASE_PREFLIGHT_ARTIFACT_NAME",
        defaultReleasePreflightArtifactName,
      ),
    ),
    smokeReport: normalizeArtifactName(
      "smoke report artifact",
      readWorkflowEnv(
        env,
        "SMOKE_REPORT_ARTIFACT_NAME",
        defaultSmokeReportArtifactName,
      ),
    ),
  };
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
