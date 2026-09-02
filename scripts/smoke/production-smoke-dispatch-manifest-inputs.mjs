import { readFile } from "node:fs/promises";
import { productionSmokeDispatchInputs } from "./production-smoke-dispatch-command.mjs";
import {
  productionSmokeDispatchInputsManifestSchemaVersion,
} from "./production-smoke-dispatch-inputs-manifest-output.mjs";
import {
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-path.mjs";
import {
  isProductionSmokeDispatchInputName,
  normalizeProductionSmokeDispatchInputValue,
} from "./production-smoke-dispatch-input-normalizers.mjs";
import {
  normalizeProductionSmokeWorkflowFile,
  normalizeProductionSmokeWorkflowRef,
} from "./production-smoke-workflow-normalizers.mjs";

const placeholderValuesByName = new Map(
  productionSmokeDispatchInputs.map((input) => [input.name, input.value]),
);

export {
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-path.mjs";

export async function readProductionSmokeDispatchManifestInputOverrides(
  inputPath,
) {
  return (
    await readProductionSmokeDispatchManifestOverrides(inputPath)
  ).inputOverrides;
}

export async function readProductionSmokeDispatchManifestOverrides(inputPath) {
  const normalizedPath =
    normalizeProductionSmokeDispatchInputsManifestOutputPath(inputPath);
  const text = await readFile(normalizedPath, "utf8");

  return createProductionSmokeDispatchManifestOverrides(
    parseDispatchManifestJson(text, normalizedPath),
  );
}

export function createProductionSmokeDispatchManifestInputOverrides(manifest) {
  return createProductionSmokeDispatchManifestOverrides(manifest).inputOverrides;
}

export function createProductionSmokeDispatchManifestOverrides(manifest) {
  assertManifestObject(manifest);

  if (
    manifest.schemaVersion !==
    productionSmokeDispatchInputsManifestSchemaVersion
  ) {
    throw new Error(
      `Production Smoke dispatch inputs manifest must use schemaVersion ${productionSmokeDispatchInputsManifestSchemaVersion}.`,
    );
  }

  if (!Array.isArray(manifest.inputs)) {
    throw new Error(
      "Production Smoke dispatch inputs manifest must include an inputs array.",
    );
  }

  const overrides = new Map();

  for (const input of manifest.inputs) {
    assertManifestObject(input);
    const name = readManifestInputName(input.name);

    if (overrides.has(name)) {
      throw new Error(
        `Production Smoke dispatch inputs manifest contains duplicate input ${name}.`,
      );
    }

    const value = readManifestInputValue(name, input.value);

    if (!isReadyManifestInputValue(name, value)) {
      continue;
    }

    overrides.set(name, normalizeProductionSmokeDispatchInputValue(name, value));
  }

  return {
    inputOverrides: overrides,
    ref: readOptionalWorkflowRef(manifest.ref),
    workflowFile: readOptionalWorkflowFile(manifest.workflowFile),
  };
}

function parseDispatchManifestJson(text, path) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} must contain valid JSON.`);
  }
}

function assertManifestObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Production Smoke dispatch inputs manifest must be a JSON object.",
    );
  }
}

function readManifestInputName(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      "Production Smoke dispatch inputs manifest entries must include input names.",
    );
  }

  if (!isProductionSmokeDispatchInputName(value)) {
    throw new Error(`Unknown Production Smoke dispatch input: ${value}`);
  }

  return value;
}

function readManifestInputValue(name, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Production Smoke dispatch input ${name} must include a string value.`,
    );
  }

  return value;
}

function isReadyManifestInputValue(name, value) {
  return (
    value !== placeholderValuesByName.get(name) &&
    !/^<[^>]+>$/u.test(value)
  );
}

function readOptionalWorkflowFile(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      "Production Smoke dispatch inputs manifest workflowFile must be a string.",
    );
  }

  return normalizeProductionSmokeWorkflowFile(value);
}

function readOptionalWorkflowRef(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      "Production Smoke dispatch inputs manifest ref must be a string.",
    );
  }

  return normalizeProductionSmokeWorkflowRef(value);
}
