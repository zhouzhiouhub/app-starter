export function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label, "must be an object");
  }
}

export function assertRecordList(value, label) {
  if (!Array.isArray(value)) {
    fail(label, "must be an array");
  }

  for (const item of value) {
    assertRecord(item, label);
  }
}

export function assertStringMap(value, label) {
  for (const [key, entry] of Object.entries(value)) {
    assertString(entry, `${label}.${key}`);
  }
}

export function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(label, "must be boolean");
  }
}

export function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    fail(label, `must be one of: ${[...allowed].join(", ")}`);
  }
}

export function assertIsoTimestamp(value, label) {
  assertString(value, label);

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    fail(label, "must be a canonical ISO timestamp");
  }
}

export function assertNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(label, "must be a non-negative number");
  }
}

export function assertNullableString(value, label) {
  if (value !== null && value !== undefined) {
    assertString(value, label);
  }
}

export function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(label, "must be a string");
  }
}

export function assertStringList(value, label) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    fail(label, "must be a string array");
  }
}

export function fail(label, message) {
  throw new Error(`Release requests manifest ${label} ${message}.`);
}
