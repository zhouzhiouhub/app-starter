import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
} from "./types";

export interface LocalizationSummaryState {
  defaultLocale: string;
  defaultMarket: string;
  fallbackLocale: string;
  isFallback: boolean;
  marketCurrency: string;
  status: "active" | "fallback" | "missing";
  translationCount: number;
  translationEntryLimit: number;
  translationRequestedLocale: string;
  translationResolvedLocale: string;
}

export function readLocalizationSummaryState(
  summary: LocalizationSummary,
): LocalizationSummaryState {
  const market = readPrimaryMarket(summary.markets);
  const locale = readPrimaryLocale(summary.locales);
  const defaultLocale =
    locale?.code ?? market?.defaultLocale ?? summary.translationsMeta.locale;
  const fallbackLocale =
    locale?.fallbackLocale ?? summary.translationsMeta.fallbackLocale;

  return {
    defaultLocale,
    defaultMarket: market?.code ?? "us",
    fallbackLocale,
    isFallback: summary.translationsMeta.isFallback,
    marketCurrency: market?.currency ?? "USD",
    status: readStatus(summary, market, locale),
    translationCount: summary.translations.length,
    translationEntryLimit: summary.translationsMeta.entryLimit,
    translationRequestedLocale: summary.translationsMeta.requestedLocale,
    translationResolvedLocale: summary.translationsMeta.locale,
  };
}

function readPrimaryMarket(
  markets: LocalizationMarket[],
): LocalizationMarket | null {
  return markets.find((market) => market.status === "active") ?? markets[0] ?? null;
}

function readPrimaryLocale(
  locales: LocalizationLocale[],
): LocalizationLocale | null {
  return locales.find((locale) => locale.status === "active") ?? locales[0] ?? null;
}

function readStatus(
  summary: LocalizationSummary,
  market: LocalizationMarket | null,
  locale: LocalizationLocale | null,
): LocalizationSummaryState["status"] {
  if (!market || !locale) {
    return "missing";
  }

  return summary.translationsMeta.isFallback ? "fallback" : "active";
}
