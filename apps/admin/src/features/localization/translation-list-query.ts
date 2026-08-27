import {
  translationListDefaultLimit,
  translationListMaxLimit,
  translationNamespaceMaxLength,
  translationNamespacePattern,
  translationSearchMaxLength,
} from "@app-starter/schema";
import type { TranslationListFilters } from "./types.ts";

const defaultPage = 1;

export function readTranslationListFilters(
  searchParams: URLSearchParams,
): TranslationListFilters {
  return {
    limit: readTranslationListLimit(searchParams),
    namespace: readTranslationNamespace(searchParams.get("namespace")),
    page: readTranslationListPage(searchParams),
    query: readTranslationSearch(
      searchParams.get("q") ?? searchParams.get("query"),
    ),
  };
}

export function buildTranslationListSearch(
  filters: TranslationListFilters = {},
): string {
  const searchParams = new URLSearchParams();
  const namespace = readTranslationNamespace(filters.namespace);
  const query = readTranslationSearch(filters.query);
  const page = readBoundedInteger(filters.page, defaultPage);
  const limit = readBoundedInteger(
    filters.limit,
    translationListDefaultLimit,
    translationListMaxLimit,
  );

  if (namespace) {
    searchParams.set("namespace", namespace);
  }

  if (query) {
    searchParams.set("q", query);
  }

  if (page > defaultPage) {
    searchParams.set("page", String(page));
  }

  if (limit !== translationListDefaultLimit) {
    searchParams.set("limit", String(limit));
  }

  return searchParams.toString();
}

function readTranslationListPage(searchParams: URLSearchParams): number {
  return readBoundedInteger(Number(searchParams.get("page")), defaultPage);
}

function readTranslationListLimit(searchParams: URLSearchParams): number {
  return readBoundedInteger(
    Number(searchParams.get("limit")),
    translationListDefaultLimit,
    translationListMaxLimit,
  );
}

function readTranslationNamespace(value: unknown): string | undefined {
  const text = readTrimmedText(value, translationNamespaceMaxLength);

  return text && translationNamespacePattern.test(text) ? text : undefined;
}

function readTranslationSearch(value: unknown): string | undefined {
  return readTrimmedText(value, translationSearchMaxLength);
}

function readTrimmedText(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim();

  return text && text.length <= maxLength ? text : undefined;
}

function readBoundedInteger(
  value: unknown,
  fallback: number,
  maxValue?: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return maxValue ? Math.min(value, maxValue) : value;
}
