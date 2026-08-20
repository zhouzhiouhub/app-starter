import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  localeCodeSchema,
  marketCodeSchema,
} from "@app-starter/schema";
import { readApiFeatureFlags } from "../../common/feature-flags.js";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";

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
  const defaults = readApiRuntimeDefaults(env);
  const flags = readApiFeatureFlags(env);

  return {
    commerceEnabled: flags.commerceEnabled,
    multiLocaleEnabled: flags.multiLocaleEnabled,
    defaultMarket: defaults.market,
    defaultLocale: defaults.locale,
    defaultCurrency: defaults.currency,
    fallbackLocale: defaults.fallbackLocale,
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

function throwValidationError(message: string): never {
  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message,
  });
}
