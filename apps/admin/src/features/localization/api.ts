import { adminRequest } from "../auth/api";
import { readApiResponseJson } from "../../lib/api-response.ts";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
  LocalizationTranslationEntry,
  LocalizationTranslationsMeta,
} from "./types";
import { readFallbackProbeLocale } from "./localization-fallback-probe";

export async function getLocalizationSummary(): Promise<LocalizationSummary> {
  const [markets, locales] = await Promise.all([getMarkets(), getLocales()]);
  const defaultLocale = locales[0]?.code ?? markets[0]?.defaultLocale ?? "en-US";
  const translations = await getTranslations(
    readFallbackProbeLocale(defaultLocale),
  );

  return {
    locales,
    markets,
    translations: translations.entries,
    translationsMeta: translations.meta,
  };
}

async function getMarkets(): Promise<LocalizationMarket[]> {
  const result = await readAdminJson<{ data?: LocalizationMarket[] }>(
    "/markets",
    "Markets could not be loaded.",
  );

  return result.data ?? [];
}

async function getLocales(): Promise<LocalizationLocale[]> {
  const result = await readAdminJson<{ data?: LocalizationLocale[] }>(
    "/locales",
    "Locales could not be loaded.",
  );

  return result.data ?? [];
}

async function getTranslations(locale: string): Promise<{
  entries: LocalizationTranslationEntry[];
  meta: LocalizationTranslationsMeta;
}> {
  const query = new URLSearchParams({ locale });
  const result = await readAdminJson<{
    data?: LocalizationTranslationEntry[];
    meta?: Partial<LocalizationTranslationsMeta>;
  }>(`/translations?${query.toString()}`, "Translations could not be loaded.");

  return {
    entries: result.data ?? [],
    meta: {
      entryLimit: result.meta?.entryLimit ?? result.data?.length ?? 0,
      fallbackLocale: result.meta?.fallbackLocale ?? locale,
      isFallback: result.meta?.isFallback === true,
      locale: result.meta?.locale ?? locale,
      requestedLocale: locale,
      requestId: result.meta?.requestId,
    },
  };
}

async function readAdminJson<T>(path: string, fallback: string): Promise<T> {
  const response = await adminRequest(path);
  return readApiResponseJson<T>(response, fallback);
}
