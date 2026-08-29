#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { normalizeArtifactName } from "./release-notes-validation.mjs";
import { readReleaseNotesCliConfig } from "./release-notes-config.mjs";
import { validateProductionSmokeWorkflowArtifacts } from "./production-smoke-release-artifacts.mjs";
import { validateProductionSmokeRuntimeReadiness } from "./production-smoke-release-readiness.mjs";
import { validateProductionSmokeRuntimeInputs } from "./production-smoke-release-runtime.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxPreflightErrorMessageLength = 3000;

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
      `Production smoke release input validation failed: ${readPreflightErrorMessage(
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

function assertNoUnknownArgs(args) {
  const unknown = args.filter((arg) => arg !== "--");

  if (unknown.length > 0) {
    throw new Error(
      `Unknown production smoke release input option: ${unknown[0]}`,
    );
  }
}

function readPreflightErrorMessage(error) {
  return formatSmokeText(error instanceof Error ? error.message : error, {
    fallback: "Unknown production smoke release input validation failure.",
    maxLength: maxPreflightErrorMessageLength,
  });
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:preflight

Checks:
  Validates Production Smoke release evidence inputs before smoke requests run.

Environment:
  SMOKE_REPORT_PATH, RELEASE_CHECK_ARTIFACT_PATH, and
  PROJECT_STATUS_ARTIFACT_PATH must be safe repository-relative JSON paths.
  SMOKE_REPORT_MARKDOWN_PATH, RELEASE_CHECK_MARKDOWN_PATH,
  PROJECT_STATUS_MARKDOWN_PATH, and RELEASE_NOTES_PATH must be safe
  repository-relative Markdown paths.
  SMOKE_REPORT_ARTIFACT_NAME, RELEASE_CHECK_ARTIFACT_NAME,
  PROJECT_STATUS_ARTIFACT_NAME, and RELEASE_NOTES_ARTIFACT_NAME must be safe
  artifact names.
  RELEASE_VISUAL_ARTIFACT_NAME and RELEASE_VISUAL_ARTIFACT_RUN_ID must be set
  together. RELEASE_TAG, RELEASE_ROLLBACK_TARGET, and
  RELEASE_VISUAL_ARTIFACT_NAME plus RELEASE_VISUAL_ARTIFACT_RUN_ID must be set
  together when release notes should be generated. PROJECT_STATUS_ARTIFACT_PATH
  and PROJECT_STATUS_ARTIFACT_NAME are required when release notes are generated.
  SMOKE_STOREFRONT_HOST must be a safe host when provided, and
  SMOKE_REQUIRE_ADMIN_APP, SMOKE_REQUIRE_R2_UPLOAD, and
  SMOKE_REQUIRE_REVALIDATION must be true or false when provided.
  SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD, SMOKE_TENANT_SLUG, SMOKE_LOCALE,
  SMOKE_MARKET, SMOKE_PAGE_SLUG, SMOKE_RETRY_ATTEMPTS, and
  SMOKE_RETRY_DELAY_MS must match smoke:publish input constraints when provided.
  When NODE_ENV, APP_ENV, or VERCEL_ENV is production, also validates runtime
  production readiness before smoke requests: production API/Web/Admin URLs,
  SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD, DATABASE_URL, REDIS_URL, MVP disabled
  feature flags, JWT keys, R2/CDN, Preview Token secret, ISR revalidation, and
  required smoke gates.
  RELEASE_NOTES_ALLOW_BLOCKED=true may only be used with release notes inputs to
  generate a failure review draft from blocked evidence.`);
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
