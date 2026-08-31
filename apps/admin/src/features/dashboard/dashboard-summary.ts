import type { PageSummary } from "../pages/types";
import type {
  DashboardLocalizationSummary,
  DashboardSummary,
  DashboardSummaryInput,
} from "./types";

export const dashboardListLimit = 100;
export const dashboardRecentItemLimit = 5;

export function buildDashboardSummary(
  input: DashboardSummaryInput,
): DashboardSummary {
  const recentPages = sortByDateDesc(input.pages.data, (page) =>
    page.updatedAt,
  ).slice(0, dashboardRecentItemLimit);
  const recentMedia = sortByDateDesc(input.media.data, (asset) =>
    asset.createdAt,
  ).slice(0, dashboardRecentItemLimit);
  const recentAuditLogs = sortByDateDesc(input.audit.data, (log) =>
    log.createdAt,
  ).slice(0, dashboardRecentItemLimit);
  const statusCounts = countStatuses(input.pages.data);
  const publishedCount = statusCounts.published ?? 0;
  const unpublishedCount = Math.max(input.pages.data.length - publishedCount, 0);

  return {
    audit: {
      recent: recentAuditLogs,
      total: input.audit.meta.total,
    },
    customRoutes: {
      routes: input.customRoutes,
      total: input.customRoutes.length,
    },
    localization: buildLocalizationSummary(input),
    media: {
      activeCount: input.media.data.filter((asset) => asset.status === "active")
        .length,
      latestCreatedAt: recentMedia[0]?.createdAt ?? null,
      recent: recentMedia,
      total: input.media.meta.total,
    },
    pages: {
      hasMoreStatusRows: input.pages.meta.total > input.pages.data.length,
      latestUpdatedAt: recentPages[0]?.updatedAt ?? null,
      publishedCount,
      recent: recentPages,
      statusCounts,
      statusSampleSize: input.pages.data.length,
      total: input.pages.meta.total,
      unpublishedCount,
    },
    site: {
      analyticsEnabled: input.settings.analytics.enabled,
      commerceEnabled: input.settings.featureFlags.commerceEnabled,
      currency: input.settings.defaults.currency,
      domain: input.settings.domain,
      fallbackLocale: input.settings.defaults.fallbackLocale,
      locale: input.settings.defaults.locale,
      market: input.settings.defaults.market,
      multiLocaleEnabled: input.settings.featureFlags.multiLocaleEnabled,
      name: input.settings.name,
    },
  };
}

function buildLocalizationSummary(
  input: DashboardSummaryInput,
): DashboardLocalizationSummary {
  const activeLocales = input.localization.locales.filter(
    (locale) => locale.status === "active",
  );
  const activeMarkets = input.localization.markets.filter(
    (market) => market.status === "active",
  );
  const translationsMeta = input.localization.translationsMeta;

  return {
    activeLocaleCount: activeLocales.length,
    activeMarketCount: activeMarkets.length,
    isFallback: translationsMeta.isFallback,
    missingKeyCount: translationsMeta.missingKeyCount,
    primaryLocale:
      activeLocales[0]?.code ??
      translationsMeta.locale ??
      input.settings.defaults.locale,
    primaryMarket: activeMarkets[0]?.code ?? input.settings.defaults.market,
    status: readLocalizationStatus(
      translationsMeta.missingKeyCount,
      translationsMeta.isFallback,
    ),
    translationsMeta,
  };
}

function readLocalizationStatus(
  missingKeyCount: number,
  isFallback: boolean,
): DashboardLocalizationSummary["status"] {
  if (missingKeyCount > 0) {
    return "missing";
  }

  return isFallback ? "fallback" : "complete";
}

function countStatuses(pages: PageSummary[]): Record<string, number> {
  return pages.reduce<Record<string, number>>((counts, page) => {
    counts[page.status] = (counts[page.status] ?? 0) + 1;
    return counts;
  }, {});
}

function sortByDateDesc<T>(
  items: T[],
  readDate: (item: T) => string,
): T[] {
  return [...items].sort(
    (first, second) => readTimestamp(readDate(second)) - readTimestamp(readDate(first)),
  );
}

function readTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
