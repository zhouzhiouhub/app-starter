import { adminRequest } from "../auth/api";
import { readApiResponseJson } from "../../lib/api-response.ts";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
  LocalizationTranslationsMeta,
} from "./types";

export async function getLocalizationSummary(): Promise<LocalizationSummary> {
  const [markets, locales] = await Promise.all([getMarkets(), getLocales()]);
  const defaultLocale = locales[0]?.code ?? markets[0]?.defaultLocale ?? "en-US";
  const translationsMeta = await getTranslationsMeta(defaultLocale);

  return {
    locales,
    markets,
    translationsMeta,
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

async function getTranslationsMeta(
  locale: string,
): Promise<LocalizationTranslationsMeta> {
  const query = new URLSearchParams({ locale });
  const result = await readAdminJson<{
    meta?: Partial<LocalizationTranslationsMeta>;
  }>(`/translations?${query.toString()}`, "Translations could not be loaded.");

  return {
    fallbackLocale: result.meta?.fallbackLocale ?? locale,
    isFallback: result.meta?.isFallback === true,
    locale: result.meta?.locale ?? locale,
    requestId: result.meta?.requestId,
  };
}

async function readAdminJson<T>(path: string, fallback: string): Promise<T> {
  const response = await adminRequest(path);
  return readApiResponseJson<T>(response, fallback);
}
