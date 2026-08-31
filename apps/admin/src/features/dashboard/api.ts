import type { CustomAdminRoute } from "@app-starter/custom-admin";
import { listAuditLogs } from "../audit/api";
import { getLocalizationSummary } from "../localization/api";
import { listMediaAssets } from "../media/api";
import { listPages } from "../pages/api";
import { getSiteSettings } from "../site-settings/api";
import { buildDashboardSummary, dashboardListLimit } from "./dashboard-summary";
import type { DashboardSummary } from "./types";

export async function getDashboardSummary(
  customRoutes: CustomAdminRoute[] = [],
): Promise<DashboardSummary> {
  const [settings, pages, media, localization, audit] = await Promise.all([
    getSiteSettings(),
    listPages(1, dashboardListLimit),
    listMediaAssets(1, dashboardListLimit, "active"),
    getLocalizationSummary({ limit: dashboardListLimit }),
    listAuditLogs({}, 1, dashboardListLimit),
  ]);

  return buildDashboardSummary({
    audit,
    customRoutes,
    localization,
    media,
    pages,
    settings,
  });
}
