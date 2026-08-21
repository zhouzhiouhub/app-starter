import { createAnalyticsDiagnostics } from "./environment-diagnostics-analytics.mjs";
import { createDatabaseDiagnostics } from "./environment-diagnostics-database.mjs";
import { createDeploymentDiagnostics } from "./deployment-diagnostics.mjs";
import { createFeatureFlagDiagnostics } from "./environment-diagnostics-feature-flags.mjs";
import { createIdentityDiagnostics } from "./environment-diagnostics-identity.mjs";
import { createMediaDiagnostics } from "./environment-diagnostics-media.mjs";
import { createPreviewDiagnostics } from "./environment-diagnostics-preview.mjs";
import { createRevalidationDiagnostics } from "./environment-diagnostics-revalidation.mjs";
import { createRedisDiagnostics } from "./environment-diagnostics-redis.mjs";

export function createSmokeEnvironmentDiagnostics(
  env = process.env,
  options = {},
) {
  return {
    analytics: createAnalyticsDiagnostics(env),
    database: createDatabaseDiagnostics(env),
    deployment: createDeploymentDiagnostics(env, options),
    featureFlags: createFeatureFlagDiagnostics(env),
    identity: createIdentityDiagnostics(env),
    media: createMediaDiagnostics(env),
    preview: createPreviewDiagnostics(env),
    redis: createRedisDiagnostics(env),
    revalidation: createRevalidationDiagnostics(env, options),
  };
}
