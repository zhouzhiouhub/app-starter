export type TranslationMessages = Record<string, string>;

export function resolveTranslatedProps<T>(
  value: T,
  messages?: TranslationMessages,
): T {
  if (!messages || typeof value !== "object" || value === null) {
    return value;
  }

  return resolveTranslatedValue(value, messages) as T;
}

function resolveTranslatedValue(
  value: unknown,
  messages: TranslationMessages,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTranslatedValue(item, messages));
  }

  if (!isRecord(value)) {
    return value;
  }

  const translated = readTranslatedText(value, messages);
  if (translated !== null) {
    return translated;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      resolveTranslatedValue(item, messages),
    ]),
  );
}

function readTranslatedText(
  value: Record<string, unknown>,
  messages: TranslationMessages,
): string | null {
  if (!isI18nTextRecord(value)) {
    return null;
  }

  if (
    typeof value.i18nKey === "string" &&
    Object.prototype.hasOwnProperty.call(messages, value.i18nKey)
  ) {
    const translated = messages[value.i18nKey];

    if (typeof translated === "string") {
      return translated;
    }
  }

  return value.defaultValue;
}

function isI18nTextRecord(
  value: Record<string, unknown>,
): value is { defaultValue: string; i18nKey?: string } {
  const keys = Object.keys(value);

  return (
    typeof value.defaultValue === "string" &&
    keys.every((key) => key === "defaultValue" || key === "i18nKey") &&
    (value.i18nKey === undefined || typeof value.i18nKey === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
