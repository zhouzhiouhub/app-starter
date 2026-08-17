export interface AnalyticsEvent {
  name: string;
  tenantId?: string;
  siteId?: string;
  market?: string;
  locale?: string;
  payload?: Record<string, unknown>;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function pushDataLayer(event: AnalyticsEvent): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: event.name,
    tenant_id: event.tenantId,
    site_id: event.siteId,
    market: event.market,
    locale: event.locale,
    ...event.payload
  });
}
