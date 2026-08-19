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
  analytics: {
    enabled: boolean;
    consentGranted: boolean;
    gtmContainerId: string | null;
    ga4MeasurementId: string | null;
    clarityProjectId: string | null;
  };
  createdAt: string;
}

export interface UpdateSiteSettingsInput {
  domain: string;
  name: string;
}
