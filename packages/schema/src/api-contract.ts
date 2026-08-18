export const apiErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  COMMERCE_DISABLED: "COMMERCE_DISABLED",
  MULTI_LOCALE_DISABLED: "MULTI_LOCALE_DISABLED",
  LOCALE_NOT_SUPPORTED: "LOCALE_NOT_SUPPORTED",
  TRANSLATION_KEY_CONFLICT: "TRANSLATION_KEY_CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof apiErrorCodes)[keyof typeof apiErrorCodes];

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    tenantId?: string;
    siteId?: string;
    market?: string;
    locale?: string;
    fallbackLocale?: string;
    isFallback?: boolean;
  };
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export const defaultRuntimeConfig = {
  commerceEnabled: false,
  multiLocaleEnabled: false,
  defaultMarket: "us",
  defaultLocale: "en-US",
  defaultCurrency: "USD",
  fallbackLocale: "en-US",
} as const;
