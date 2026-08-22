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
  fallbackLocale: string;
  isFallback: boolean;
  locale: string;
  requestId?: string;
}

export interface LocalizationSummary {
  locales: LocalizationLocale[];
  markets: LocalizationMarket[];
  translationsMeta: LocalizationTranslationsMeta;
}
