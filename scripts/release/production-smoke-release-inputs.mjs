#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { normalizeArtifactName } from "./release-notes-validation.mjs";
import { readReleaseNotesCliConfig } from "./release-notes-config.mjs";
import {
  printProductionSmokePreflightHelp,
  readProductionSmokePreflightCliConfig,
} from "./production-smoke-preflight-cli.mjs";
import { validateProductionSmokeWorkflowArtifacts } from "./production-smoke-release-artifacts.mjs";
import {
  readProductionSmokePreflightErrorMessage,
  writeProductionSmokePreflightReport,
} from "./production-smoke-preflight-report.mjs";
import { validateProductionSmokeRuntimeReadiness } from "./production-smoke-release-readiness.mjs";
import { validateProductionSmokeRuntimeInputs } from "./production-smoke-release-runtime.mjs";

export function validateProductionSmokeReleaseInputs(env = process.env) {
  validateProductionSmokeWorkflowArtifacts(env);
  validateProductionSmokeRuntimeInputs(env);

  const visualArtifact = readVisualArtifactInput(env);
  const releaseNotes = readReleaseNotesInput(env);
  const allowBlockedReleaseNotes = readReleaseNotesAllowBlockedInput(env);

  if (allowBlockedReleaseNotes && !releaseNotes.enabled) {
    throw new Error(
      "allow_blocked_release_notes requires release_tag, rollback_target, visual_artifact_name, and visual_artifact_run_id together.",
    );
  }

  if (releaseNotes.enabled) {
    readReleaseNotesCliConfig(
      createReleaseNotesArgs(env, {
        allowBlocked: allowBlockedReleaseNotes,
      }),
    );
  }

  validateProductionSmokeRuntimeReadiness(env);

  return {
    releaseNotesAllowBlocked: allowBlockedReleaseNotes,
    releaseNotesEnabled: releaseNotes.enabled,
    visualArtifactDownloadEnabled: visualArtifact.enabled,
  };
}

export async function runProductionSmokeReleaseInputsCli(
  args = [],
  input = {},
) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printProductionSmokePreflightHelp(stdout);
    return 0;
  }

  let config;

  try {
    config = readProductionSmokePreflightCliConfig(args);
  } catch (error) {
    stderr(
      `Production smoke release input validation failed: ${readProductionSmokePreflightErrorMessage(
        error,
      )}`,
    );
    return 1;
  }

  const env = input.env ?? process.env;
  let result;

  try {
    result = validateProductionSmokeReleaseInputs(env);
  } catch (error) {
    await writePreflightFailureReport(config, env, error, stderr);
    stderr(
      `Production smoke release input validation failed: ${readProductionSmokePreflightErrorMessage(
        error,
      )}`,
    );
    return 1;
  }

  try {
    await writeProductionSmokePreflightReport(config, { env, result });
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
      `Production smoke preflight report write failed: ${readProductionSmokePreflightErrorMessage(
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
  const visualArtifactRunId = normalizeOptionalText(
    env.RELEASE_VISUAL_ARTIFACT_RUN_ID,
  );
  const values = [
    releaseTag,
    rollbackTarget,
    visualArtifactName,
    visualArtifactRunId,
  ];
  const enabled = values.every(Boolean);

  if (!enabled && values.some(Boolean)) {
    throw new Error(
      "Release notes require release_tag, rollback_target, visual_artifact_name, and visual_artifact_run_id together.",
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

async function writePreflightFailureReport(config, env, error, stderr) {
  try {
    await writeProductionSmokePreflightReport(config, { env, error });
  } catch (reportError) {
    stderr(
      `Production smoke preflight report write failed: ${readProductionSmokePreflightErrorMessage(
        reportError,
      )}`,
    );
  }
}

function isMainModule() {
  return (
    process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runProductionSmokeReleaseInputsCli(
    process.argv.slice(2),
  );
}
