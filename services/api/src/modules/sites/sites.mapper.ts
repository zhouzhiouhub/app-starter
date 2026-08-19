export type SiteSettingsRecord = {
  createdAt: Date;
  domain: string;
  id: string;
  name: string;
  tenantId: string;
};

export function toSiteSettingsResponse(site: SiteSettingsRecord) {
  return {
    id: site.id,
    tenantId: site.tenantId,
    name: site.name,
    domain: site.domain,
    defaults: {
      market: process.env.DEFAULT_MARKET ?? "us",
      locale: process.env.DEFAULT_LOCALE ?? "en-US",
      currency: process.env.DEFAULT_CURRENCY ?? "USD",
      fallbackLocale: process.env.FALLBACK_LOCALE ?? "en-US",
    },
    featureFlags: {
      commerceEnabled: process.env.COMMERCE_ENABLED === "true",
      multiLocaleEnabled: process.env.MULTI_LOCALE_ENABLED === "true",
    },
    analytics: {
      enabled: process.env.ANALYTICS_ENABLED === "true",
      consentGranted: process.env.ANALYTICS_CONSENT_GRANTED === "true",
      gtmContainerId: readOptionalEnv("GTM_CONTAINER_ID"),
      ga4MeasurementId: readOptionalEnv("GA4_MEASUREMENT_ID"),
      clarityProjectId: readOptionalEnv("CLARITY_PROJECT_ID"),
    },
    createdAt: site.createdAt.toISOString(),
  };
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}
