import { adminRequest } from "../auth/api.ts";
import { readApiResponseJson } from "../../lib/api-response.ts";
import { createIdempotencyKey } from "../../lib/idempotency-key.ts";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
  LocalizationTranslationEntry,
  LocalizationTranslationsMeta,
  UpsertDefaultTranslationInput,
} from "./types.ts";
import { readFallbackProbeLocale } from "./localization-fallback-probe.ts";

export async function getLocalizationSummary(): Promise<LocalizationSummary> {
  const [markets, locales] = await Promise.all([getMarkets(), getLocales()]);
  const defaultLocale =
    locales[0]?.code ?? markets[0]?.defaultLocale ?? "en-US";
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

export async function upsertDefaultTranslationEntry(
  input: UpsertDefaultTranslationInput,
): Promise<LocalizationTranslationEntry> {
  const result = await readAdminJson<{ data?: LocalizationTranslationEntry }>(
    "/translations",
    {
      body: JSON.stringify({
        context: input.context ?? null,
        key: input.key,
        locale: input.locale,
        value: input.value,
      }),
      headers: jsonHeaders(),
      method: "POST",
    },
    "Translation entry could not be saved.",
  );

  if (!result.data?.key) {
    throw new Error("Translation entry could not be saved.");
  }

  return result.data;
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

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Idempotency-Key": createIdempotencyKey(),
  };
}

async function readAdminJson<T>(
  path: string,
  initOrFallback: RequestInit | string,
  fallback?: string,
): Promise<T> {
  const init = typeof initOrFallback === "string" ? {} : initOrFallback;
  const fallbackMessage =
    typeof initOrFallback === "string" ? initOrFallback : fallback;
  const response = await adminRequest(path, init);
  return readApiResponseJson<T>(
    response,
    fallbackMessage ?? "Request could not be completed.",
  );
}
