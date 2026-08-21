import { createAnalyticsDiagnostics } from "./environment-diagnostics-analytics.mjs";
import { createDeploymentDiagnostics } from "./deployment-diagnostics.mjs";
import { createFeatureFlagDiagnostics } from "./environment-diagnostics-feature-flags.mjs";
import { createMediaDiagnostics } from "./environment-diagnostics-media.mjs";
import { createPreviewDiagnostics } from "./environment-diagnostics-preview.mjs";
import { createRevalidationDiagnostics } from "./environment-diagnostics-revalidation.mjs";

export function createSmokeEnvironmentDiagnostics(
  env = process.env,
  options = {},
) {
  return {
    analytics: createAnalyticsDiagnostics(env),
    deployment: createDeploymentDiagnostics(env, options),
    featureFlags: createFeatureFlagDiagnostics(env),
    media: createMediaDiagnostics(env),
    preview: createPreviewDiagnostics(env),
    revalidation: createRevalidationDiagnostics(env, options),
  };
}
