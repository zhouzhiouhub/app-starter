import { createSmokeEnvironmentDiagnostics } from "../smoke/environment-diagnostics.mjs";
import { normalizeSmokeBoolean } from "../smoke/publish-smoke-config-normalizers.mjs";
import { isProductionSmokeEnvironment } from "../smoke/publish-smoke-config.mjs";
import { createSmokeProductionReadiness } from "../smoke/smoke-readiness.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const defaultProductionSmokeReportPath =
  "artifacts/production-smoke/smoke-report.json";
const maxReadinessFailureBlockers = 16;
const maxReadinessFailureMessageLength = 3000;
const maxReadinessFailureBlockerLength = 220;

export function validateProductionSmokeRuntimeReadiness(env = process.env) {
  if (!isProductionSmokeEnvironment(env)) {
    return {
      productionReadinessChecked: false,
      productionReady: null,
    };
  }

  const config = readProductionSmokeReadinessConfig(env);
  const environment = createSmokeEnvironmentDiagnostics(env, {
    requireRevalidation: config.requireRevalidation,
  });
  const readiness = createSmokeProductionReadiness(environment, config);

  if (!readiness.productionReady) {
    throw new Error(formatReadinessFailure(readiness));
  }

  return {
    blockerCount: readiness.blockers.length,
    productionReadinessChecked: true,
    productionReady: true,
    warningCount: readiness.warnings.length,
  };
}

export function readProductionSmokeReadinessConfig(env = process.env) {
  return {
    reportPath: normalizeSmokeReportPath(
      readWorkflowEnv(
        env,
        "SMOKE_REPORT_PATH",
        defaultProductionSmokeReportPath,
      ),
    ),
    requireAdminApp: readBooleanEnv(env, "SMOKE_REQUIRE_ADMIN_APP", true),
    requireR2Upload: readBooleanEnv(env, "SMOKE_REQUIRE_R2_UPLOAD", true),
    requireRevalidation: readBooleanEnv(
      env,
      "SMOKE_REQUIRE_REVALIDATION",
      true,
    ),
  };
}

function readBooleanEnv(env, name, fallback) {
  if (!Object.hasOwn(env, name) || typeof env[name] !== "string") {
    return fallback;
  }

  const value = env[name].trim();

  return value ? normalizeSmokeBoolean(value, name) : fallback;
}

function readWorkflowEnv(env, name, fallback) {
  if (!Object.hasOwn(env, name)) {
    return fallback;
  }

  return env[name];
}

function formatReadinessFailure(readiness) {
  const blockers = Array.isArray(readiness.blockers) ? readiness.blockers : [];
  const visibleBlockers = blockers
    .slice(0, maxReadinessFailureBlockers)
    .map(formatReadinessBlocker);
  const remainingCount = blockers.length - visibleBlockers.length;
  const remaining =
    remainingCount > 0 ? `; ... and ${remainingCount} more blocker(s)` : "";
  const summary = visibleBlockers.length
    ? `${visibleBlockers.join("; ")}${remaining}`
    : "production readiness returned false without structured blockers";

  return formatSmokeText(
    `Production smoke runtime readiness failed before smoke requests (${blockers.length} blockers): ${summary}`,
    { maxLength: maxReadinessFailureMessageLength },
  );
}

function formatReadinessBlocker(blocker) {
  const area = readBlockerText(blocker?.area, "unknown");
  const issue = readBlockerText(blocker?.issue, "unknown");
  const message = readBlockerText(
    blocker?.message,
    "Review the production readiness blocker.",
  );

  return formatSmokeText(`${area}/${issue}: ${message}`, {
    fallback: "unknown/unknown: Review the production readiness blocker.",
    maxLength: maxReadinessFailureBlockerLength,
  });
}

function readBlockerText(value, fallback) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}
