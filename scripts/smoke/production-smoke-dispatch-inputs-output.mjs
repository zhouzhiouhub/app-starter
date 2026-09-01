import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { normalizeSmokeReportTextPath } from "./smoke-report-path-config.mjs";

export const defaultProductionSmokeDispatchInputsOutputPath =
  "artifacts/production-smoke/production-smoke-dispatch-inputs.txt";

export function createProductionSmokeDispatchInputsText(dispatchArtifact) {
  const inputs = Array.isArray(dispatchArtifact?.inputs)
    ? dispatchArtifact.inputs
    : [];

  return inputs.length > 0
    ? `${inputs.map(formatDispatchInput).join("\n")}\n`
    : "";
}

export async function writeProductionSmokeDispatchInputsText(
  outputPath,
  dispatchArtifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createProductionSmokeDispatchInputsText(dispatchArtifact),
    "utf8",
  );
}

export function normalizeProductionSmokeDispatchInputsOutputPath(value) {
  return normalizeSmokeReportTextPath(value, {
    label: "Production Smoke dispatch inputs output",
    relativeDescription: "repository-relative text path",
  });
}

function formatDispatchInput(input) {
  return `${input.name}=${input.value}`;
}
