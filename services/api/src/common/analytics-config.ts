import { readBooleanEnv } from "./feature-flags.js";

export type AnalyticsRuntimeConfig = {
  clarityProjectId: string | null;
  consentGranted: boolean;
  enabled: boolean;
  ga4MeasurementId: string | null;
  gtmContainerId: string | null;
};

const maxAnalyticsProviderIdLength = 64;

export function readAnalyticsRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
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
