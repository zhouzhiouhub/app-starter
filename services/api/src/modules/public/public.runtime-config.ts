import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  defaultRuntimeConfig,
  localeCodeSchema,
  marketCodeSchema,
} from "@app-starter/schema";

export type PublicRuntimeConfig = {
  commerceEnabled: boolean;
  defaultCurrency: string;
  defaultLocale: string;
  defaultMarket: string;
  fallbackLocale: string;
  multiLocaleEnabled: boolean;
};

export type PublicLocaleContext = {
  defaultLocale: string;
  fallbackLocale: string;
  isFallback: boolean;
  locale: string;
};

export type PublicMarketContext = {
  isFallback: boolean;
  market: string;
};

export function readPublicRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): PublicRuntimeConfig {
  return {
    commerceEnabled: env.COMMERCE_ENABLED === "true",
    multiLocaleEnabled: env.MULTI_LOCALE_ENABLED === "true",
    defaultMarket: readMarketEnvValue(
      env.DEFAULT_MARKET,
      defaultRuntimeConfig.defaultMarket,
    ),
    defaultLocale: readLocaleEnvValue(
      env.DEFAULT_LOCALE,
      defaultRuntimeConfig.defaultLocale,
    ),
    defaultCurrency: readCurrencyEnvValue(
      env.DEFAULT_CURRENCY,
      defaultRuntimeConfig.defaultCurrency,
    ),
    fallbackLocale: readLocaleEnvValue(
      env.FALLBACK_LOCALE,
      defaultRuntimeConfig.fallbackLocale,
    ),
  };
}

export function resolvePublicLocale(
  locale: string | undefined,
  env: Record<string, string | undefined> = process.env,
): PublicLocaleContext {
  const config = readPublicRuntimeConfig(env);
  const requestedLocale = locale ?? config.defaultLocale;
  const parsed = localeCodeSchema.safeParse(requestedLocale);

  if (!parsed.success) {
    throwValidationError("Locale must look like en-US.");
  }

  const isFallback =
    !config.multiLocaleEnabled && parsed.data !== config.defaultLocale;

  return {
    defaultLocale: config.defaultLocale,
    fallbackLocale: config.fallbackLocale,
    isFallback,
    locale: isFallback ? config.defaultLocale : parsed.data,
  };
}

export function resolvePublicMarket(
  market: string | undefined,
  env: Record<string, string | undefined> = process.env,
): PublicMarketContext {
  const config = readPublicRuntimeConfig(env);
  const requestedMarket = market ?? config.defaultMarket;
  const parsed = marketCodeSchema.safeParse(requestedMarket);

  if (!parsed.success) {
    throwValidationError("Market code must be lowercase.");
  }

  const isFallback = parsed.data !== config.defaultMarket;

  return {
    isFallback,
    market: isFallback ? config.defaultMarket : parsed.data,
  };
}

function readLocaleEnvValue(
  value: string | undefined,
  fallback: string,
): string {
  const parsed = localeCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function readMarketEnvValue(
  value: string | undefined,
  fallback: string,
): string {
  const parsed = marketCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function readCurrencyEnvValue(
  value: string | undefined,
  fallback: string,
): string {
  const currency = value?.trim();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : fallback;
}

function throwValidationError(message: string): never {
  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message,
  });
}
