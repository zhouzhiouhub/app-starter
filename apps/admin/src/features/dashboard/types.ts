import type { CustomAdminRoute } from "@app-starter/custom-admin";
import type { AuditLog, AuditLogListMeta } from "../audit/types";
import type {
  LocalizationSummary,
  LocalizationTranslationsMeta,
} from "../localization/types";
import type { MediaAsset, MediaListMeta } from "../media/types";
import type { PageListMeta, PageSummary } from "../pages/types";
import type { SiteSettings } from "../site-settings/types";

export interface DashboardSummaryInput {
  audit: { data: AuditLog[]; meta: AuditLogListMeta };
  customRoutes: CustomAdminRoute[];
  localization: LocalizationSummary;
  media: { data: MediaAsset[]; meta: MediaListMeta };
  pages: { data: PageSummary[]; meta: PageListMeta };
  settings: SiteSettings;
}

export interface DashboardSummary {
  audit: DashboardAuditSummary;
  customRoutes: DashboardCustomRouteSummary;
  localization: DashboardLocalizationSummary;
  media: DashboardMediaSummary;
  pages: DashboardPagesSummary;
  site: DashboardSiteSummary;
}

export interface DashboardSiteSummary {
  analyticsEnabled: boolean;
  commerceEnabled: boolean;
  currency: string;
  domain: string;
  fallbackLocale: string;
  locale: string;
  market: string;
  multiLocaleEnabled: boolean;
  name: string;
}

export interface DashboardPagesSummary {
  hasMoreStatusRows: boolean;
  latestUpdatedAt: string | null;
  publishedCount: number;
  recent: PageSummary[];
  statusCounts: Record<string, number>;
  statusSampleSize: number;
  total: number;
  unpublishedCount: number;
}

export interface DashboardMediaSummary {
  activeCount: number;
  latestCreatedAt: string | null;
  recent: MediaAsset[];
  total: number;
}

export interface DashboardLocalizationSummary {
  activeLocaleCount: number;
  activeMarketCount: number;
  isFallback: boolean;
  missingKeyCount: number;
  primaryLocale: string;
  primaryMarket: string;
  status: "complete" | "fallback" | "missing";
  translationsMeta: LocalizationTranslationsMeta;
}

export interface DashboardAuditSummary {
  recent: AuditLog[];
  total: number;
}

export interface DashboardCustomRouteSummary {
  routes: CustomAdminRoute[];
  total: number;
}
