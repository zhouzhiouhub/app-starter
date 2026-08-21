import { collectSmokeReadinessFindings } from "./smoke-readiness-collectors.mjs";
import { createSmokeReadinessNextActions } from "./smoke-readiness-actions.mjs";

export { createSmokeReadinessNextActions } from "./smoke-readiness-actions.mjs";

export function createSmokeProductionReadiness(environment, config) {
  const { blockers, warnings } = collectSmokeReadinessFindings(
    environment,
    config,
  );

  return {
    blockers,
    nextActions: createSmokeReadinessNextActions(blockers, warnings),
    productionReady: blockers.length === 0,
    warnings,
  };
}
