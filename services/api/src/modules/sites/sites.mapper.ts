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
    createdAt: site.createdAt.toISOString(),
  };
}
