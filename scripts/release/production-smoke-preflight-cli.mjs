import {
  normalizeProductionSmokePreflightJsonReportPath,
  normalizeProductionSmokePreflightMarkdownReportPath,
} from "./production-smoke-preflight-report.mjs";

export function readProductionSmokePreflightCliConfig(args) {
  const config = {
    jsonOutput: null,
    markdownOutput: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--json-output") {
      config.jsonOutput = normalizeProductionSmokePreflightJsonReportPath(
        readOptionValue(args, index, arg),
      );
      index += 1;
      continue;
    }

    if (arg === "--markdown-output") {
      config.markdownOutput =
        normalizeProductionSmokePreflightMarkdownReportPath(
          readOptionValue(args, index, arg),
        );
      index += 1;
      continue;
    }

    throw new Error(`Unknown production smoke release input option: ${arg}`);
  }

  return config;
}

export function printProductionSmokePreflightHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:preflight
  pnpm release:preflight -- --json-output artifacts/release/preflight.json --markdown-output artifacts/release/preflight.md

Checks:
  Validates Production Smoke release evidence inputs before smoke requests run.
  Optional --json-output and --markdown-output paths write a preflight report
  for both passed and failed validation.

Environment:
  SMOKE_REPORT_PATH, RELEASE_CHECK_ARTIFACT_PATH, and
  PROJECT_STATUS_ARTIFACT_PATH must be safe repository-relative JSON paths.
  SMOKE_REPORT_MARKDOWN_PATH, RELEASE_CHECK_MARKDOWN_PATH,
  PROJECT_STATUS_MARKDOWN_PATH, and RELEASE_NOTES_PATH must be safe
  repository-relative Markdown paths.
  SMOKE_REPORT_ARTIFACT_NAME, RELEASE_CHECK_ARTIFACT_NAME,
  PROJECT_STATUS_ARTIFACT_NAME, RELEASE_NOTES_ARTIFACT_NAME, and
  RELEASE_PREFLIGHT_ARTIFACT_NAME must be safe artifact names.
  RELEASE_VISUAL_ARTIFACT_NAME and RELEASE_VISUAL_ARTIFACT_RUN_ID must be set
  together. RELEASE_TAG, RELEASE_ROLLBACK_TARGET, and
  RELEASE_VISUAL_ARTIFACT_NAME plus RELEASE_VISUAL_ARTIFACT_RUN_ID must be set
  together when release notes should be generated. PROJECT_STATUS_ARTIFACT_PATH
  and PROJECT_STATUS_ARTIFACT_NAME are required when release notes are generated.
  RELEASE_PREFLIGHT_ARTIFACT_NAME is also required for release notes evidence.
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

function readOptionValue(args, index, option) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}
