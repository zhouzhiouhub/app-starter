const requiredDisabledFeatureFlags = [
  "COMMERCE_ENABLED",
  "MULTI_LOCALE_ENABLED",
];

export function createFeatureFlagDiagnostics(env = process.env) {
  const flags = Object.fromEntries(
    requiredDisabledFeatureFlags.map((name) => [
      name,
      readDisabledFlagDiagnostic(env, name),
    ]),
  );
  const values = Object.values(flags);

  return {
    configured: values.every((flag) => flag.configured),
    disabled: values.every((flag) => flag.disabled),
    flags,
    productionReady: values.every((flag) => flag.productionReady),
  };
}

function readDisabledFlagDiagnostic(env, name) {
  const raw = env[name]?.trim();

  if (!raw) {
    return {
      configured: false,
      disabled: false,
      issue: "missing-env",
      productionReady: false,
    };
  }

  const parsed = readBooleanValue(raw);

  if (parsed === false) {
    return {
      configured: true,
      disabled: true,
      issue: null,
      productionReady: true,
    };
  }

  return {
    configured: true,
    disabled: false,
    issue: parsed === true ? "enabled" : "invalid-boolean",
    productionReady: false,
  };
}

function readBooleanValue(value) {
  const normalized = value.toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}
