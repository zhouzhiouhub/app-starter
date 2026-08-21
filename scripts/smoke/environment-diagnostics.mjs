import { createDeploymentDiagnostics } from "./deployment-diagnostics.mjs";
import { createMediaDiagnostics } from "./environment-diagnostics-media.mjs";
import { createRevalidationDiagnostics } from "./environment-diagnostics-revalidation.mjs";

export function createSmokeEnvironmentDiagnostics(
  env = process.env,
  options = {},
) {
  return {
    deployment: createDeploymentDiagnostics(env, options),
    media: createMediaDiagnostics(env),
    revalidation: createRevalidationDiagnostics(env, options),
  };
}
