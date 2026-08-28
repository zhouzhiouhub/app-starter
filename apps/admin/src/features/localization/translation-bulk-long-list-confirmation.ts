import type {
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationListFilters,
} from "./types.ts";

export type TranslationBulkLongListAction = "export-download" | "import";

export function formatTranslationBulkLongListConfirmation(input: {
  action: TranslationBulkLongListAction;
  exportPreview?: TranslationExportPreviewResult | null;
  filters?: TranslationListFilters;
  meta: Pick<
    LocalizationTranslationsMeta,
    "limit" | "locale" | "page" | "total"
  >;
}): string | null {
  const scope = readLongListScope(input.meta);

  if (!scope) {
    return null;
  }

  const filterScope = formatFilterScope(input.filters ?? {});

  if (input.action === "import") {
    return `Long default ${input.meta.locale} list: table page ${scope.page} shows rows ${scope.start}-${scope.end} of ${scope.total}${filterScope}. Import may update rows outside the visible page; latest Preview import counts are the source of truth.`;
  }

  const exportableCount =
    input.exportPreview?.exportableEntryCount ?? input.meta.total;

  return `Long default ${input.meta.locale} list: Export JSON will download ${exportableCount} matching ${formatCountLabel(exportableCount, "row")}${filterScope}, not only rows ${scope.start}-${scope.end} visible on page ${scope.page}. Preview export first if the count looks unexpected.`;
}

function readLongListScope(
  meta: Pick<LocalizationTranslationsMeta, "limit" | "page" | "total">,
) {
  const limit = Math.max(1, meta.limit);
  const total = Math.max(0, meta.total);

  if (total <= limit) {
    return null;
  }

  const page = Math.max(1, meta.page);
  const start = Math.min(total, (page - 1) * limit + 1);
  const end = Math.min(total, page * limit);

  return {
    end,
    page,
    start,
    total,
  };
}

function formatFilterScope(filters: TranslationListFilters): string {
  const parts = [
    formatFilterPart("namespace", filters.namespace),
    formatFilterPart("q", filters.query),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? ` under ${parts.join(", ")}` : "";
}

function formatFilterPart(
  label: string,
  value: string | undefined,
): string | null {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}

function formatCountLabel(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}
