import { adminRequest } from "../auth/api.ts";
import { readApiResponseJson } from "../../lib/api-response.ts";
import { createIdempotencyKey } from "../../lib/idempotency-key.ts";
import { translationListDefaultLimit } from "@app-starter/schema";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
  LocalizationTranslationEntry,
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationImportPreviewResult,
  TranslationListFilters,
  UpsertDefaultTranslationInput,
  UpsertDefaultTranslationResult,
} from "./types.ts";
import { readFallbackProbeLocale } from "./localization-fallback-probe.ts";

export async function getLocalizationSummary(
  filters: TranslationListFilters = {},
): Promise<LocalizationSummary> {
  const [markets, locales] = await Promise.all([getMarkets(), getLocales()]);
  const defaultLocale =
    locales[0]?.code ?? markets[0]?.defaultLocale ?? "en-US";
  const translations = await getTranslations(
    readFallbackProbeLocale(defaultLocale),
    filters,
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
): Promise<UpsertDefaultTranslationResult> {
  const result = await readAdminJson<{
    data?: LocalizationTranslationEntry;
    meta?: { writeMode?: "created" | "updated" };
  }>(
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

  return {
    entry: result.data,
    writeMode: result.meta?.writeMode ?? "updated",
  };
}

export async function previewTranslationImport(
  body: unknown,
): Promise<TranslationImportPreviewResult> {
  const result = await readAdminJson<{
    data?: TranslationImportPreviewResult;
  }>(
    "/translations/import/preview",
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "Translation import preview could not be prepared.",
  );

  if (!result.data?.summary || !Array.isArray(result.data.entries)) {
    throw new Error("Translation import preview could not be prepared.");
  }

  return result.data;
}

export async function previewTranslationExport(
  filters: TranslationListFilters,
  locale: string,
): Promise<TranslationExportPreviewResult> {
  const result = await readAdminJson<{
    data?: TranslationExportPreviewResult;
  }>(
    "/translations/export/preview",
    {
      body: JSON.stringify({
        locale,
        namespace: filters.namespace,
        q: filters.query,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "Translation export preview could not be prepared.",
  );

  if (!result.data) {
    throw new Error("Translation export preview could not be prepared.");
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

async function getTranslations(
  locale: string,
  filters: TranslationListFilters,
): Promise<{
  entries: LocalizationTranslationEntry[];
  meta: LocalizationTranslationsMeta;
}> {
  const query = new URLSearchParams({ locale });

  if (filters.page) {
    query.set("page", String(filters.page));
  }

  if (filters.limit) {
    query.set("limit", String(filters.limit));
  }

  if (filters.namespace) {
    query.set("namespace", filters.namespace);
  }

  if (filters.query) {
    query.set("q", filters.query);
  }

  const result = await readAdminJson<{
    data?: LocalizationTranslationEntry[];
    meta?: Partial<LocalizationTranslationsMeta>;
  }>(`/translations?${query.toString()}`, "Translations could not be loaded.");

  return {
    entries: result.data ?? [],
    meta: {
      entryLimit: result.meta?.entryLimit ?? result.data?.length ?? 0,
      expectedKeyCount: result.meta?.expectedKeyCount ?? 0,
      fallbackLocale: result.meta?.fallbackLocale ?? locale,
      isFallback: result.meta?.isFallback === true,
      limit: result.meta?.limit ?? filters.limit ?? translationListDefaultLimit,
      locale: result.meta?.locale ?? locale,
      missingKeyCount: result.meta?.missingKeyCount ?? 0,
      missingKeyPreviewLimit: result.meta?.missingKeyPreviewLimit ?? 0,
      missingKeys: result.meta?.missingKeys ?? [],
      namespace: result.meta?.namespace ?? filters.namespace,
      page: result.meta?.page ?? filters.page ?? 1,
      query: result.meta?.query ?? filters.query,
      requestedLocale: locale,
      requestId: result.meta?.requestId,
      total: result.meta?.total ?? result.data?.length ?? 0,
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
