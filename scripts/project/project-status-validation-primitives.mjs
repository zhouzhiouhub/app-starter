export function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`Project status artifact ${label} must be boolean.`);
  }
}

export function assertCountNotGreater(value, max, label, maxLabel) {
  if (value > max) {
    throw new Error(
      `Project status artifact ${label} must not exceed ${maxLabel}.`,
    );
  }
}

export function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new Error(
      `Project status artifact ${label} must be one of: ${[...allowed].join(
        ", ",
      )}.`,
    );
  }
}

export function assertIsoTimestamp(value, label) {
  assertString(value, label);

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(
      `Project status artifact ${label} must be a canonical ISO timestamp.`,
    );
  }
}

export function assertNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Project status artifact ${label} must be a non-negative number.`,
    );
  }
}

export function assertOptionalNonNegativeNumber(value, label) {
  if (value !== undefined) {
    assertNonNegativeNumber(value, label);
  }
}

export function assertNullableString(value, label) {
  if (value !== null && value !== undefined && !isNonEmptyString(value)) {
    throw new Error(
      `Project status artifact ${label} must be a string or null.`,
    );
  }
}

export function assertString(value, label) {
  if (!isNonEmptyString(value)) {
    throw new Error(`Project status artifact ${label} must be a string.`);
  }
}

export function assertStringList(value, label) {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`Project status artifact ${label} must be a string array.`);
  }
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
