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
  expectedKeyCount: number;
  fallbackLocale: string;
  isFallback: boolean;
  limit: number;
  locale: string;
  missingKeyCount: number;
  missingKeyPreviewLimit: number;
  missingKeys: string[];
  namespace?: string;
  page: number;
  query?: string;
  requestedLocale: string;
  requestId?: string;
  total: number;
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
  limit?: number;
  namespace?: string;
  page?: number;
  query?: string;
}

export interface LocalizationSummary {
  locales: LocalizationLocale[];
  markets: LocalizationMarket[];
  translations: LocalizationTranslationEntry[];
  translationsMeta: LocalizationTranslationsMeta;
}
