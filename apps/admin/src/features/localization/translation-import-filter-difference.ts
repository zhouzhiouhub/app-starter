export function formatTranslationImportFilterDifferenceMessage(input: {
  importText: string;
  namespace?: string;
  query?: string;
}): string | null {
  const filters = readActiveFilterLabels(input);

  if (filters.length === 0) {
    return null;
  }

  const parsed = readImportTemplateEntries(input.importText);

  if (!parsed.ok) {
    return null;
  }

  const outsideFilterCount = parsed.entries.filter(
    (entry) => !matchesTranslationFilters(entry, input),
  ).length;

  if (outsideFilterCount === 0) {
    return null;
  }

  return `${outsideFilterCount} draft ${outsideFilterCount === 1 ? "row is" : "rows are"} outside current translation filters (${filters.join(", ")}). Import still writes default Locale rows, but the table may hide them until filters are cleared.`;
}

function readImportTemplateEntries(
  importText: string,
):
  | { entries: unknown[]; ok: true }
  | { ok: false; reason: "invalid-envelope" | "invalid-json" } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(importText);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "invalid-envelope" };
  }

  const entries = (parsed as Record<string, unknown>).entries;

  if (!Array.isArray(entries)) {
    return { ok: false, reason: "invalid-envelope" };
  }

  return { entries, ok: true };
}

function matchesTranslationFilters(
  entry: unknown,
  filters: { namespace?: string; query?: string },
): boolean {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return true;
  }

  const record = entry as Record<string, unknown>;
  const key = readFilterableText(record.key);

  if (filters.namespace?.trim() && !matchesNamespace(key, filters.namespace)) {
    return false;
  }

  const query = filters.query?.trim();

  if (!query) {
    return true;
  }

  return [
    key,
    readFilterableText(record.value),
    readFilterableText(record.context),
  ]
    .filter(Boolean)
    .some((value) => value.includes(query));
}

function matchesNamespace(key: string, namespace: string | undefined): boolean {
  const normalizedNamespace = namespace?.trim();

  if (!normalizedNamespace) {
    return true;
  }

  return (
    key === normalizedNamespace || key.startsWith(`${normalizedNamespace}.`)
  );
}

function readActiveFilterLabels(input: {
  namespace?: string;
  query?: string;
}): string[] {
  return [
    formatFilterLabel("namespace", input.namespace),
    formatFilterLabel("q", input.query),
  ].filter((label): label is string => Boolean(label));
}

function formatFilterLabel(label: string, value: string | undefined) {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}

function readFilterableText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
