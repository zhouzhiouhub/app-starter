import type { SiteSettings } from "../site-settings/types";
import type { AnalyticsProviderStatus, AnalyticsSettingsSummary } from "./types";

export function buildAnalyticsSettingsSummary(
  settings: SiteSettings,
): AnalyticsSettingsSummary {
  const providers = readProviderStatuses(settings);

  return {
    consentGranted: settings.analytics.consentGranted,
    configuredProviderCount: providers.filter((provider) => provider.configured)
      .length,
    enabled: settings.analytics.enabled,
    locale: settings.defaults.locale,
    market: settings.defaults.market,
    providers,
  };
}

function readProviderStatuses(settings: SiteSettings): AnalyticsProviderStatus[] {
  return [
    {
      configured: Boolean(settings.analytics.gtmContainerId),
      key: "gtm",
      label: "GTM",
    },
    {
      configured: Boolean(settings.analytics.ga4MeasurementId),
      key: "ga4",
      label: "GA4",
    },
    {
      configured: Boolean(settings.analytics.clarityProjectId),
      key: "clarity",
      label: "Clarity",
    },
  ];
}
