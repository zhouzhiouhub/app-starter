export interface SiteSettings {
  id: string;
  tenantId: string;
  name: string;
  domain: string;
  defaults: {
    market: string;
    locale: string;
    currency: string;
    fallbackLocale: string;
  };
  featureFlags: {
    commerceEnabled: boolean;
    multiLocaleEnabled: boolean;
  };
  createdAt: string;
}

export interface UpdateSiteSettingsInput {
  domain: string;
  name: string;
}
