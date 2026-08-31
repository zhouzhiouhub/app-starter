export interface AnalyticsProviderStatus {
  configured: boolean;
  key: string;
  label: string;
}

export interface AnalyticsSettingsSummary {
  consentGranted: boolean;
  configuredProviderCount: number;
  enabled: boolean;
  locale: string;
  market: string;
  providers: AnalyticsProviderStatus[];
}
