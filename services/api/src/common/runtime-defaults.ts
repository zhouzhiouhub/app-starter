import {
  defaultRuntimeConfig,
  localeCodeSchema,
  marketCodeSchema,
} from "@app-starter/schema";

export type ApiRuntimeDefaults = {
  currency: string;
  fallbackLocale: string;
  locale: string;
  market: string;
};

export function readApiRuntimeDefaults(
  env: Record<string, string | undefined> = process.env,
): ApiRuntimeDefaults {
  return {
    currency: readCurrencyValue(
      env.DEFAULT_CURRENCY,
      defaultRuntimeConfig.defaultCurrency,
    ),
    fallbackLocale: readLocaleValue(
      env.FALLBACK_LOCALE,
      defaultRuntimeConfig.fallbackLocale,
    ),
    locale: readLocaleValue(
      env.DEFAULT_LOCALE,
      defaultRuntimeConfig.defaultLocale,
    ),
    market: readMarketValue(
      env.DEFAULT_MARKET,
      defaultRuntimeConfig.defaultMarket,
    ),
  };
}

export function readApiDefaultLocale(
  env: Record<string, string | undefined> = process.env,
): string {
  return readApiRuntimeDefaults(env).locale;
}

function readLocaleValue(value: string | undefined, fallback: string): string {
  const parsed = localeCodeSchema.safeParse(value?.trim());
  return parsed.success ? parsed.data : fallback;
}

function readMarketValue(value: string | undefined, fallback: string): string {
  const parsed = marketCodeSchema.safeParse(value?.trim());
  return parsed.success ? parsed.data : fallback;
}

function readCurrencyValue(
  value: string | undefined,
  fallback: string,
): string {
  const currency = value?.trim();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : fallback;
}
