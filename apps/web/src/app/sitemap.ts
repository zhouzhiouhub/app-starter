import type { MetadataRoute } from "next";
import {
  defaultRuntimeConfig,
  getStorefrontHref,
} from "@app-starter/schema";
import { listPublishedPages } from "../lib/published-pages";
import { getWebOrigin } from "../lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locale =
    process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale;
  const market =
    process.env.DEFAULT_MARKET ?? defaultRuntimeConfig.defaultMarket;
  const origin = getWebOrigin();
  const pages = await listPublishedPages({ locale, market });

  return pages
    .filter((page) => !page.noIndex && !isSystemPageSlug(page.slug))
    .map((page) => ({
      changeFrequency: page.slug === "home" ? "daily" : "weekly",
      lastModified: page.publishedAt ?? page.updatedAt,
      priority: page.slug === "home" ? 1 : 0.7,
      url: `${origin}${getStorefrontHref(locale, page.slug)}`,
    }));
}

function isSystemPageSlug(slug: string): boolean {
  const leafSlug = slug.split("/").filter(Boolean).pop();
  return leafSlug === "404";
}
