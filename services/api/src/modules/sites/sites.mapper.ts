import { readAnalyticsRuntimeConfig } from "../../common/analytics-config.js";
import { readApiFeatureFlags } from "../../common/feature-flags.js";
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
  const featureFlags = readApiFeatureFlags();
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
    featureFlags,
    analytics,
    createdAt: site.createdAt.toISOString(),
  };
}
