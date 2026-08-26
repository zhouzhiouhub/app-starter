export interface LocalizationMarket {
  code: string;
  currency: string;
  defaultLocale: string;
  status: string;
}

export interface LocalizationLocale {
  code: string;
  fallbackLocale: string;
  status: string;
}

export interface LocalizationTranslationsMeta {
  entryLimit: number;
  fallbackLocale: string;
  isFallback: boolean;
  locale: string;
  namespace?: string;
  query?: string;
  requestedLocale: string;
  requestId?: string;
}

export interface LocalizationTranslationEntry {
  context?: string | null;
  key: string;
  locale: string;
  updatedAt?: string;
  value: string;
}

export interface UpsertDefaultTranslationInput {
  context?: string | null;
  key: string;
  locale: string;
  value: string;
}

export interface UpsertDefaultTranslationResult {
  entry: LocalizationTranslationEntry;
  writeMode: "created" | "updated";
}

export interface TranslationListFilters {
  namespace?: string;
  query?: string;
}

export interface LocalizationSummary {
  locales: LocalizationLocale[];
  markets: LocalizationMarket[];
  translations: LocalizationTranslationEntry[];
  translationsMeta: LocalizationTranslationsMeta;
}
