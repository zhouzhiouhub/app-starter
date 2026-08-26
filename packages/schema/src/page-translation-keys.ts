import { translationKeySchema } from "./foundation-translations.js";

export function collectPageTranslationKeys(value: unknown): string[] {
  const keys = new Set<string>();

  collectTranslationKeys(value, keys);

  return Array.from(keys).sort();
}

function collectTranslationKeys(value: unknown, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTranslationKeys(item, keys);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const i18nKey = value.i18nKey;

  if (
    typeof i18nKey === "string" &&
    translationKeySchema.safeParse(i18nKey).success
  ) {
    keys.add(i18nKey);
  }

  for (const child of Object.values(value)) {
    collectTranslationKeys(child, keys);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}
