export function formatMissingTranslationKeyFilterScopeMessage(input: {
  namespace?: string;
  query?: string;
}): string | null {
  const filters = [
    formatScopePart("namespace", input.namespace),
    formatScopePart("q", input.query),
  ].filter((part): part is string => Boolean(part));

  if (filters.length === 0) {
    return null;
  }

  return `Missing key pages follow current translation filters (${filters.join(", ")}). Clear filters to review every visible missing key; remembered page is clamped when filters change.`;
}

export function formatMissingTranslationKeyEmptyActionMessage(input: {
  namespace?: string;
  query?: string;
}): string {
  if (!hasMissingTranslationKeyFilters(input)) {
    return "Visible missing key queue is complete. Refresh missing keys to confirm server coverage.";
  }

  return "Filtered missing key queue is complete. Clear filters to continue with the wider repair queue, or refresh missing keys to confirm server coverage.";
}

export function formatMissingTranslationKeyFilterRestoreMessage(input: {
  missingKeys: string[];
  namespace?: string;
  query?: string;
  resolvedKeys?: string[];
  selectedKey?: string | null;
}): string | null {
  const selectedKey = input.selectedKey?.trim();

  if (!selectedKey || !hasMissingTranslationKeyFilters(input)) {
    return null;
  }

  if (readTrimmedSet(input.missingKeys).has(selectedKey)) {
    return null;
  }

  if (readTrimmedSet(input.resolvedKeys ?? []).has(selectedKey)) {
    return null;
  }

  return `Selected missing key ${selectedKey} is outside the current filtered queue. Clear filters to restore the wider queue before continuing repairs.`;
}

export function hasMissingTranslationKeyFilters(input: {
  namespace?: string;
  query?: string;
}): boolean {
  return Boolean(input.namespace?.trim() || input.query?.trim());
}

function formatScopePart(
  label: string,
  value: string | undefined,
): string | null {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}
function readTrimmedSet(values: string[]): Set<string> {
  return new Set(values.map((value) => value.trim()).filter(Boolean));
}
