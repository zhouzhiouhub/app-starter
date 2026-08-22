import type { MetadataRoute } from "next";
import { listPublishedPages } from "../lib/published-pages";
import { readWebRuntimeDefaults } from "../lib/runtime-defaults";
import { getStorefrontOrigin } from "../lib/site-url";
import { buildPublishedPageSitemapEntries } from "../lib/sitemap-entries";
import { readStorefrontRequestHost } from "../lib/storefront-request-host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const defaults = readWebRuntimeDefaults();
  const locale = defaults.defaultLocale;
  const market = defaults.defaultMarket;
  const storefrontHost = await readStorefrontRequestHost();
  const origin = getStorefrontOrigin({ storefrontHost });
  const pages = await listPublishedPages({ locale, market, storefrontHost });

  return buildPublishedPageSitemapEntries({
    locale,
    origin,
    pages,
  });
}
