export function assertMissingProductionSmokeEvidenceArtifact(
  evidence,
  fieldPath,
) {
  if (!isRecord(evidence)) {
    throw new Error(`${fieldPath} must be an object when present.`);
  }

  assertString(evidence.status, `${fieldPath}.status`);
  assertString(evidence.summaryStatus, `${fieldPath}.summaryStatus`);
  assertNonNegativeNumber(
    evidence.requiredEvidenceCount,
    `${fieldPath}.requiredEvidenceCount`,
  );
  assertNonNegativeNumber(
    evidence.workflowInputCount,
    `${fieldPath}.workflowInputCount`,
  );
  assertRequiredSmokeEvidenceItems(evidence, fieldPath);
  assertSmokeEvidenceInputSourceItems(evidence, fieldPath);
  assertSmokeWorkflowInputItems(evidence, fieldPath);
}

function assertRequiredSmokeEvidenceItems(evidence, fieldPath) {
  if (!Array.isArray(evidence.requiredEvidence)) {
    throw new Error(`${fieldPath}.requiredEvidence must be an array.`);
  }

  if (evidence.requiredEvidenceCount !== evidence.requiredEvidence.length) {
    throw new Error(
      `${fieldPath}.requiredEvidenceCount must match requiredEvidence length.`,
    );
  }

  for (const item of evidence.requiredEvidence) {
    if (!isRecord(item)) {
      throw new Error(`${fieldPath}.requiredEvidence must contain objects.`);
    }

    assertString(item.label, `${fieldPath}.requiredEvidence.label`);
    assertString(item.value, `${fieldPath}.requiredEvidence.value`);
  }
}

function assertSmokeEvidenceInputSourceItems(evidence, fieldPath) {
  const hasInputSources = evidence.inputSources !== undefined;
  const hasInputSourceCount = evidence.inputSourceCount !== undefined;

  if (!hasInputSources && !hasInputSourceCount) {
    return;
  }

  if (!Array.isArray(evidence.inputSources)) {
    throw new Error(`${fieldPath}.inputSources must be an array when present.`);
  }

  assertNonNegativeNumber(
    evidence.inputSourceCount,
    `${fieldPath}.inputSourceCount`,
  );

  if (evidence.inputSourceCount !== evidence.inputSources.length) {
    throw new Error(
      `${fieldPath}.inputSourceCount must match inputSources length.`,
    );
  }

  for (const input of evidence.inputSources) {
    if (!isRecord(input)) {
      throw new Error(`${fieldPath}.inputSources must contain objects.`);
    }

    assertString(input.name, `${fieldPath}.inputSources.name`);
    assertString(input.source, `${fieldPath}.inputSources.source`);
    assertString(input.value, `${fieldPath}.inputSources.value`);
  }
}

function assertSmokeWorkflowInputItems(evidence, fieldPath) {
  if (!Array.isArray(evidence.workflowInputs)) {
    throw new Error(`${fieldPath}.workflowInputs must be an array.`);
  }

  if (evidence.workflowInputCount !== evidence.workflowInputs.length) {
    throw new Error(
      `${fieldPath}.workflowInputCount must match workflowInputs length.`,
    );
  }

  for (const input of evidence.workflowInputs) {
    if (!isRecord(input)) {
      throw new Error(`${fieldPath}.workflowInputs must contain objects.`);
    }

    assertString(input.description, `${fieldPath}.workflowInputs.description`);
    assertString(input.name, `${fieldPath}.workflowInputs.name`);
    assertBoolean(input.required, `${fieldPath}.workflowInputs.required`);
    assertString(input.value, `${fieldPath}.workflowInputs.value`);
  }
}

function assertString(value, fieldPath) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fieldPath} must be a non-empty string.`);
  }
}

function assertBoolean(value, fieldPath) {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldPath} must be a boolean.`);
  }
}

function assertNonNegativeNumber(value, fieldPath) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(`${fieldPath} must be a non-negative number.`);
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
