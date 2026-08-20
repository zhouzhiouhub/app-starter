export type ApiFeatureFlags = {
  commerceEnabled: boolean;
  multiLocaleEnabled: boolean;
};

export function readApiFeatureFlags(
  env: Record<string, string | undefined> = process.env,
): ApiFeatureFlags {
  return {
    commerceEnabled: readBooleanEnv(env.COMMERCE_ENABLED),
    multiLocaleEnabled: readBooleanEnv(env.MULTI_LOCALE_ENABLED),
  };
}

export function isMultiLocaleEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return readApiFeatureFlags(env).multiLocaleEnabled;
}

export function readBooleanEnv(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}
