#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { normalizeArtifactName } from "./release-notes-validation.mjs";
import { readReleaseNotesCliConfig } from "./release-notes-config.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";

const defaultSmokeReportPath = "artifacts/production-smoke/smoke-report.json";
const defaultReleaseCheckArtifactPath = "artifacts/release/release-check.json";
const defaultProjectStatusArtifactPath = "artifacts/release/project-status.json";

export function validateProductionSmokeReleaseInputs(env = process.env) {
  validateWorkflowArtifactPaths(env);

  const visualArtifact = readVisualArtifactInput(env);
  const releaseNotes = readReleaseNotesInput(env);
  const allowBlockedReleaseNotes = readReleaseNotesAllowBlockedInput(env);

  if (allowBlockedReleaseNotes && !releaseNotes.enabled) {
    throw new Error(
      "allow_blocked_release_notes requires release_tag, rollback_target, and visual_artifact_name together.",
    );
  }

  if (releaseNotes.enabled) {
    readReleaseNotesCliConfig(
      createReleaseNotesArgs(env, {
        allowBlocked: allowBlockedReleaseNotes,
      }),
    );
  }

  return {
    releaseNotesAllowBlocked: allowBlockedReleaseNotes,
    releaseNotesEnabled: releaseNotes.enabled,
    visualArtifactDownloadEnabled: visualArtifact.enabled,
  };
}

function validateWorkflowArtifactPaths(env) {
  normalizeSmokeReportPath(
    readWorkflowPathEnv(env, "SMOKE_REPORT_PATH", defaultSmokeReportPath),
  );
  normalizeJsonArtifactPath(
    "Release check artifact",
    readWorkflowPathEnv(
      env,
      "RELEASE_CHECK_ARTIFACT_PATH",
      defaultReleaseCheckArtifactPath,
    ),
  );
  normalizeJsonArtifactPath(
    "Project status artifact",
    readWorkflowPathEnv(
      env,
      "PROJECT_STATUS_ARTIFACT_PATH",
      defaultProjectStatusArtifactPath,
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

export async function runProductionSmokeReleaseInputsCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    assertNoUnknownArgs(args);
    const env = input.env ?? process.env;
    const result = validateProductionSmokeReleaseInputs(env);
    stdout(
      [
        "Production smoke release inputs validated:",
        `releaseNotesAllowBlocked=${formatEnabled(
          result.releaseNotesAllowBlocked,
        )},`,
        `releaseNotes=${formatEnabled(result.releaseNotesEnabled)},`,
        `visualArtifactDownload=${formatEnabled(
          result.visualArtifactDownloadEnabled,
        )}`,
      ].join(" "),
    );
    return 0;
  } catch (error) {
    stderr(
      `Production smoke release input validation failed: ${readErrorMessage(
        error,
      )}`,
    );
    return 1;
  }
}

function readVisualArtifactInput(env) {
  const name = normalizeOptionalText(env.RELEASE_VISUAL_ARTIFACT_NAME);
  const runId = normalizeOptionalText(env.RELEASE_VISUAL_ARTIFACT_RUN_ID);

  if (Boolean(name) !== Boolean(runId)) {
    throw new Error(
      "Provide both visual_artifact_name and visual_artifact_run_id, or leave both empty.",
    );
  }

  if (!name) {
    return { enabled: false };
  }

  normalizeArtifactName("visual artifact", name);
  assertGithubRunId(runId);

  return { enabled: true };
}

function readReleaseNotesInput(env) {
  const releaseTag = normalizeOptionalText(env.RELEASE_TAG);
  const rollbackTarget = normalizeOptionalText(env.RELEASE_ROLLBACK_TARGET);
  const visualArtifactName = normalizeOptionalText(
    env.RELEASE_VISUAL_ARTIFACT_NAME,
  );
  const values = [releaseTag, rollbackTarget, visualArtifactName];
  const enabled = values.every(Boolean);

  if (!enabled && values.some(Boolean)) {
    throw new Error(
      "Release notes require release_tag, rollback_target, and visual_artifact_name together.",
    );
  }

  return { enabled };
}

function readReleaseNotesAllowBlockedInput(env) {
  const value = normalizeOptionalText(env.RELEASE_NOTES_ALLOW_BLOCKED);

  if (!value || value === "false") {
    return false;
  }

  if (value === "true") {
    return true;
  }

  throw new Error("allow_blocked_release_notes must be true or false.");
}

function createReleaseNotesArgs(env, options = {}) {
  const args = [
    "--release-tag",
    env.RELEASE_TAG,
    "--workflow-run-url",
    createWorkflowRunUrl(env),
    "--smoke-artifact",
    env.SMOKE_REPORT_ARTIFACT_NAME,
    "--release-artifact",
    env.RELEASE_CHECK_ARTIFACT_NAME,
    "--project-status",
    env.PROJECT_STATUS_ARTIFACT_PATH,
    "--project-status-artifact",
    env.PROJECT_STATUS_ARTIFACT_NAME,
    "--visual-artifact",
    env.RELEASE_VISUAL_ARTIFACT_NAME,
    "--storefront-url",
    readStorefrontUrl(env),
    "--rollback-target",
    env.RELEASE_ROLLBACK_TARGET,
    "--release-check",
    env.RELEASE_CHECK_ARTIFACT_PATH,
    "--output",
    env.RELEASE_NOTES_PATH,
  ];

  return options.allowBlocked ? ["--allow-blocked", ...args] : args;
}

function createWorkflowRunUrl(env) {
  const repository = normalizeOptionalText(env.GITHUB_REPOSITORY);
  const runId = normalizeOptionalText(env.GITHUB_RUN_ID);

  if (!repository || !runId) {
    throw new Error(
      "GITHUB_REPOSITORY and GITHUB_RUN_ID are required when release notes are enabled.",
    );
  }

  assertGithubRunId(runId);
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

function readStorefrontUrl(env) {
  return (
    normalizeOptionalText(env.RELEASE_STOREFRONT_URL) ??
    normalizeOptionalText(env.WEB_URL)
  );
}

function assertGithubRunId(value) {
  if (!/^[0-9]{1,20}$/u.test(value)) {
    throw new Error("GitHub workflow run id must contain only digits.");
  }
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatEnabled(value) {
  return value ? "enabled" : "disabled";
}

function readWorkflowPathEnv(env, name, fallback) {
  if (!Object.hasOwn(env, name)) {
    return fallback;
  }

  return env[name];
}

function assertNoUnknownArgs(args) {
  const unknown = args.filter((arg) => arg !== "--");

  if (unknown.length > 0) {
    throw new Error(
      `Unknown production smoke release input option: ${unknown[0]}`,
    );
  }
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:preflight

Checks:
  Validates Production Smoke release evidence inputs before smoke requests run.

Environment:
  SMOKE_REPORT_PATH, RELEASE_CHECK_ARTIFACT_PATH, and
  PROJECT_STATUS_ARTIFACT_PATH must be safe repository-relative JSON paths.
  RELEASE_VISUAL_ARTIFACT_NAME and RELEASE_VISUAL_ARTIFACT_RUN_ID must be set
  together. RELEASE_TAG, RELEASE_ROLLBACK_TARGET, and
  RELEASE_VISUAL_ARTIFACT_NAME must be set together when release notes should be
  generated. PROJECT_STATUS_ARTIFACT_PATH and PROJECT_STATUS_ARTIFACT_NAME are
  required when release notes are generated. RELEASE_NOTES_ALLOW_BLOCKED=true
  may only be used with release notes inputs to generate a failure review draft
  from blocked evidence.`);
}

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runProductionSmokeReleaseInputsCli(
    process.argv.slice(2),
  );
}
