import { readAnalyticsRuntimeConfig } from "../../common/analytics-config.js";
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
  const analytics = readAnalyticsRuntimeConfig();

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
    analytics,
    createdAt: site.createdAt.toISOString(),
  };
}
