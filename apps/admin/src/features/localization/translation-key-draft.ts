import {
  translationContextMaxLength,
  translationKeyPattern,
} from "@app-starter/schema";

export interface TranslationKeyDraft {
  context: string;
  key: string;
}

export interface TranslationKeyOption {
  value: string;
}

export function createTranslationKeyDraft(
  value: unknown,
): TranslationKeyDraft | null {
  const key = readTranslationKey(value);

  if (!key) {
    return null;
  }

  return {
    context: createTranslationContext(key),
    key,
  };
}

export function readTranslationKeyOptions(
  keys: string[],
): TranslationKeyOption[] {
  const seen = new Set<string>();

  return keys.reduce<TranslationKeyOption[]>((options, key) => {
    const value = readTranslationKey(key);

    if (!value || seen.has(value)) {
      return options;
    }

    seen.add(value);
    options.push({ value });

    return options;
  }, []);
}

function readTranslationKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const key = value.trim();

  return translationKeyPattern.test(key) ? key : null;
}

function createTranslationContext(key: string): string {
  const segments = key.split(".");
  const field = segments.at(-1);
  const namespace = segments.slice(0, -1).join(".");
  const context = namespace && field ? `${namespace} / ${field}` : key;

  return context.slice(0, translationContextMaxLength);
}
