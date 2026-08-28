import type { TranslationListFilters } from "./types.ts";

export type TranslationAuditReturnSource =
  "translation-exported" | "translation-imported";

export interface TranslationAuditReturnContext {
  description: string;
  message: string;
  source: TranslationAuditReturnSource;
  type: "info";
}

const auditReturnSearchParam = "auditReturn";

export function appendTranslationAuditReturnContext(
  search: string,
  source: TranslationAuditReturnSource,
): string {
  const searchParams = new URLSearchParams(search);

  searchParams.set(auditReturnSearchParam, source);

  return searchParams.toString();
}

export function clearTranslationAuditReturnContext(
  searchParams: URLSearchParams,
): string {
  const nextSearchParams = new URLSearchParams(searchParams);

  nextSearchParams.delete(auditReturnSearchParam);

  return nextSearchParams.toString();
}

export function readTranslationAuditReturnContext(
  searchParams: URLSearchParams,
  filters: TranslationListFilters,
): TranslationAuditReturnContext | null {
  const source = readTranslationAuditReturnSource(searchParams);

  if (!source) {
    return null;
  }

  if (source === "translation-imported") {
    return {
      description:
        "Showing default Locale translations. Import audit rows record counts, actor, request, and target without translation values.",
      message: "Returned from translation import audit",
      source,
      type: "info",
    };
  }

  return {
    description: `Showing default Locale translations from audited export filters: ${formatFilterScope(filters)}.`,
    message: "Returned from translation export audit",
    source,
    type: "info",
  };
}

function readTranslationAuditReturnSource(
  searchParams: URLSearchParams,
): TranslationAuditReturnSource | null {
  const source = searchParams.get(auditReturnSearchParam)?.trim();

  if (source === "translation-imported" || source === "translation-exported") {
    return source;
  }

  return null;
}

function formatFilterScope(filters: TranslationListFilters): string {
  const parts = [
    formatFilterPart("namespace", filters.namespace),
    formatFilterPart("q", filters.query),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(", ") : "default Locale export scope";
}

function formatFilterPart(
  label: string,
  value: string | undefined,
): string | null {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}
