export function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`Release check artifact ${label} must be boolean.`);
  }
}

export function assertCountDoesNotExceed(value, max, label, maxLabel) {
  if (value > max) {
    throw new Error(
      `Release check artifact ${label} must not exceed ${maxLabel}.`,
    );
  }
}

export function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new Error(
      `Release check artifact ${label} must be one of: ${[...allowed].join(
        ", ",
      )}.`,
    );
  }
}

export function assertNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Release check artifact ${label} must be a non-negative number.`,
    );
  }
}

export function assertNullableString(value, label) {
  if (value !== null && value !== undefined && !isNonEmptyString(value)) {
    throw new Error(`Release check artifact ${label} must be a string or null.`);
  }
}

export function assertOptionalNonNegativeNumber(value, label) {
  if (value !== undefined) {
    assertNonNegativeNumber(value, label);
  }
}

export function assertOptionalStringList(value, label) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`Release check artifact ${label} must be a string array.`);
  }
}

export function assertString(value, label) {
  if (!isNonEmptyString(value)) {
    throw new Error(`Release check artifact ${label} must be a string.`);
  }
}

export function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

export function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
