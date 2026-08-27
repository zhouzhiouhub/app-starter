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

function formatScopePart(
  label: string,
  value: string | undefined,
): string | null {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}
