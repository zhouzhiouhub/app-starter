import {
  defaultRuntimeConfig,
  localeCodeSchema,
  marketCodeSchema,
} from "@app-starter/schema";

export type WebRuntimeDefaults = {
  defaultLocale: string;
  defaultMarket: string;
  fallbackLocale: string;
};

export function readWebRuntimeDefaults(
  env: Record<string, string | undefined> = process.env,
): WebRuntimeDefaults {
  return {
    defaultLocale: readLocaleValue(
      env.DEFAULT_LOCALE,
      defaultRuntimeConfig.defaultLocale,
    ),
    defaultMarket: readMarketValue(
      env.DEFAULT_MARKET,
      defaultRuntimeConfig.defaultMarket,
    ),
    fallbackLocale: readLocaleValue(
      env.FALLBACK_LOCALE,
      defaultRuntimeConfig.fallbackLocale,
    ),
  };
}

export function resolveWebLocale(
  value: string | undefined,
  defaults: WebRuntimeDefaults = readWebRuntimeDefaults(),
): string | null {
  return resolveRuntimeValue(value, defaults.defaultLocale, readLocaleValue);
}

export function resolveWebMarket(
  value: string | undefined,
  defaults: WebRuntimeDefaults = readWebRuntimeDefaults(),
): string | null {
  return resolveRuntimeValue(value, defaults.defaultMarket, readMarketValue);
}

function resolveRuntimeValue(
  value: string | undefined,
  fallback: string,
  readValue: (value: string | undefined, fallback: string) => string,
): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return fallback;
  }

  const parsed = readValue(candidate, "");
  return parsed || null;
}

function readLocaleValue(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  const parsed = localeCodeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

function readMarketValue(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  const parsed = marketCodeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}
