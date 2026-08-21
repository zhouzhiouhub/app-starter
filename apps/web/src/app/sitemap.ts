import type { MetadataRoute } from "next";
import { listPublishedPages } from "../lib/published-pages";
import { readWebRuntimeDefaults } from "../lib/runtime-defaults";
import { getWebOrigin } from "../lib/site-url";
import { buildPublishedPageSitemapEntries } from "../lib/sitemap-entries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const defaults = readWebRuntimeDefaults();
  const locale = defaults.defaultLocale;
  const market = defaults.defaultMarket;
  const origin = getWebOrigin();
  const pages = await listPublishedPages({ locale, market });

  return buildPublishedPageSitemapEntries({
    locale,
    origin,
    pages,
  });
}
