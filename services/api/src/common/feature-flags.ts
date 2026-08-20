export type ApiFeatureFlags = {
  commerceEnabled: boolean;
  multiLocaleEnabled: boolean;
};

export function readApiFeatureFlags(
  env: Record<string, string | undefined> = process.env,
): ApiFeatureFlags {
  return {
    commerceEnabled: readBooleanEnv("COMMERCE_ENABLED", env.COMMERCE_ENABLED),
    multiLocaleEnabled: readBooleanEnv(
      "MULTI_LOCALE_ENABLED",
      env.MULTI_LOCALE_ENABLED,
    ),
  };
}

export function isMultiLocaleEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return readApiFeatureFlags(env).multiLocaleEnabled;
}

export function readBooleanEnv(
  name: string,
  value: string | undefined,
): boolean {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}
