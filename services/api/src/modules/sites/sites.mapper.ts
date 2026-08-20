import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";

export type SiteSettingsRecord = {
  createdAt: Date;
  domain: string;
  id: string;
  name: string;
  tenantId: string;
};

export function toSiteSettingsResponse(site: SiteSettingsRecord) {
  const defaults = readApiRuntimeDefaults();

  return {
    id: site.id,
    tenantId: site.tenantId,
    name: site.name,
    domain: site.domain,
    defaults: {
      market: defaults.market,
      locale: defaults.locale,
      currency: defaults.currency,
      fallbackLocale: defaults.fallbackLocale,
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
