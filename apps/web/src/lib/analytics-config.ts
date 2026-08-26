export type AnalyticsRuntimeConfig = {
  enabled: boolean;
  consentGranted: boolean;
  gtmContainerId: string | null;
  ga4MeasurementId: string | null;
  clarityProjectId: string | null;
};

const maxAnalyticsProviderIdLength = 64;

export function readAnalyticsRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): AnalyticsRuntimeConfig {
  return {
    enabled: readBooleanEnv("ANALYTICS_ENABLED", env.ANALYTICS_ENABLED),
    consentGranted: readBooleanEnv(
      "ANALYTICS_CONSENT_GRANTED",
      env.ANALYTICS_CONSENT_GRANTED,
    ),
    gtmContainerId: readProviderId(env.GTM_CONTAINER_ID, /^GTM-[A-Z0-9]+$/i),
    ga4MeasurementId: readProviderId(env.GA4_MEASUREMENT_ID, /^G-[A-Z0-9]+$/i),
    clarityProjectId: readProviderId(env.CLARITY_PROJECT_ID, /^[a-z0-9]+$/i),
  };
}

export function hasAnalyticsProvider(config: AnalyticsRuntimeConfig): boolean {
  return Boolean(
    config.gtmContainerId || config.ga4MeasurementId || config.clarityProjectId,
  );
}

export function shouldLoadAnalyticsScripts(
  config: AnalyticsRuntimeConfig,
): boolean {
  return (
    config.enabled && config.consentGranted && hasAnalyticsProvider(config)
  );
}

function readBooleanEnv(name: string, value: string | undefined): boolean {
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

function readProviderId(
  value: string | undefined,
  pattern: RegExp,
): string | null {
  if (
    !value ||
    value.trim().length === 0 ||
    value.trim() !== value ||
    hasControlCharacter(value) ||
    value.length > maxAnalyticsProviderIdLength ||
    !pattern.test(value)
  ) {
    return null;
  }

  return value;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
