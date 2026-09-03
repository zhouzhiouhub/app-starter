import {
  productionSmokeEvidenceInputSources,
} from "./production-smoke-evidence-input-sources.mjs";

export function readProductionSmokeDispatchInputMissingReason(input) {
  if (input?.placeholder !== true) {
    return "";
  }

  const source = productionSmokeEvidenceInputSources.find(
    (item) => item.name === input.name,
  );
  const value = typeof input.value === "string" ? input.value : "";

  return source
    ? `replace placeholder ${value} with ${source.source}`
    : `replace placeholder ${value} before dispatch`;
}
