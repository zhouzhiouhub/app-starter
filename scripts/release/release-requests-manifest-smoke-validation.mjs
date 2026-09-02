import {
  assertBoolean,
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertRecord,
  assertRecordList,
  assertString,
  assertStringList,
  fail,
} from "./release-requests-manifest-validation-primitives.mjs";

const smokeInputStatuses = new Set(["ready", "missing"]);

export function assertProductionSmoke(smoke) {
  assertRecord(smoke, "productionSmoke");
  assertDispatchManifestContext(smoke.dispatchManifestContext);
  assertString(smoke.dispatchCommand, "productionSmoke.dispatchCommand");
  assertNonNegativeNumber(smoke.inputCount, "productionSmoke.inputCount");
  assertRecordList(smoke.inputSources, "productionSmoke.inputSources");
  assertStringList(smoke.missingInputs, "productionSmoke.missingInputs");
  assertNonNegativeNumber(
    smoke.missingInputCount,
    "productionSmoke.missingInputCount",
  );
  assertSmokeInputs(smoke);
  assertBoolean(smoke.readyToDispatch, "productionSmoke.readyToDispatch");
  assertNullableString(
    smoke.inputsManifestPath,
    "productionSmoke.inputsManifestPath",
  );
  assertNullableString(smoke.inputsOutputPath, "productionSmoke.inputsOutputPath");
  assertNullableString(smoke.inputsTablePath, "productionSmoke.inputsTablePath");
  assertNullableString(smoke.requestPath, "productionSmoke.requestPath");
  assertRecordList(smoke.requiredEvidence, "productionSmoke.requiredEvidence");
  assertString(smoke.ref, "productionSmoke.ref");
  assertString(smoke.validationCommand, "productionSmoke.validationCommand");
  assertString(smoke.workflowFile, "productionSmoke.workflowFile");
  assertRecordList(smoke.workflowInputs, "productionSmoke.workflowInputs");
}

function assertDispatchManifestContext(context) {
  assertRecord(context, "productionSmoke.dispatchManifestContext");
  assertStringList(
    context.inheritedFields,
    "productionSmoke.dispatchManifestContext.inheritedFields",
  );
  assertString(
    context.overridePolicy,
    "productionSmoke.dispatchManifestContext.overridePolicy",
  );
  assertString(context.summary, "productionSmoke.dispatchManifestContext.summary");

  for (const field of ["workflowFile", "ref", "inputs"]) {
    if (!context.inheritedFields.includes(field)) {
      fail(
        "productionSmoke.dispatchManifestContext.inheritedFields",
        `must include ${field}`,
      );
    }
  }
}

function assertSmokeInputs(smoke) {
  if (!Array.isArray(smoke.inputs)) {
    fail("productionSmoke.inputs", "must be an array");
  }

  if (smoke.inputCount !== smoke.inputs.length) {
    fail("productionSmoke.inputCount", "must match inputs length");
  }

  if (smoke.missingInputCount !== smoke.missingInputs.length) {
    fail("productionSmoke.missingInputCount", "must match missingInputs length");
  }

  for (const input of smoke.inputs) {
    assertRecord(input, "productionSmoke.inputs");
    assertString(input.name, "productionSmoke.inputs.name");
    assertString(input.source, "productionSmoke.inputs.source");
    assertEnum(input.status, smokeInputStatuses, "productionSmoke.inputs.status");
    assertString(input.value, "productionSmoke.inputs.value");
    assertBoolean(input.workflowRequired, "productionSmoke.inputs.workflowRequired");
  }
}
