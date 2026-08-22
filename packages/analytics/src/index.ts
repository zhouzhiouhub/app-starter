export interface AnalyticsEvent {
  name: string;
  tenantId?: string;
  siteId?: string;
  market?: string;
  locale?: string;
  payload?: Record<string, unknown>;
}

const reservedDataLayerKeys = new Set([
  "event",
  "tenant_id",
  "site_id",
  "market",
  "locale",
]);

const sensitivePayloadKeyFragments = [
  "accesskey",
  "address",
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "email",
  "password",
  "phone",
  "secret",
  "session",
  "signature",
  "token",
];

const redactedAnalyticsValue = "[redacted]";
const emailValuePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phoneValuePattern =
  /(?:^|[^\d])(?:\+?\d[\d\s().-]{6,}\d)(?:[^\d]|$)/;

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
    ...sanitizeAnalyticsPayload(event.payload),
    event: event.name,
    tenant_id: event.tenantId,
    site_id: event.siteId,
    market: event.market,
    locale: event.locale,
  });
}

export function sanitizeAnalyticsPayload(
  payload: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return sanitizeAnalyticsRecord(payload ?? {}, true);
}

function sanitizeAnalyticsRecord(
  payload: Record<string, unknown>,
  dropReservedKeys: boolean,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !isBlockedPayloadKey(key, dropReservedKeys))
      .map(([key, value]) => [key, sanitizeAnalyticsValue(value)]),
  );
}

function sanitizeAnalyticsValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAnalyticsValue(item));
  }

  if (isPlainRecord(value)) {
    return sanitizeAnalyticsRecord(value, false);
  }

  if (typeof value === "string" && containsSensitiveStringValue(value)) {
    return redactedAnalyticsValue;
  }

  return value;
}

function isBlockedPayloadKey(key: string, dropReservedKeys: boolean): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();

  if (dropReservedKeys && reservedDataLayerKeys.has(key)) {
    return true;
  }

  return sensitivePayloadKeyFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

function containsSensitiveStringValue(value: string): boolean {
  return emailValuePattern.test(value) || phoneValuePattern.test(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
