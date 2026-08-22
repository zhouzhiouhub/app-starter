import { getStorefrontHref } from "@app-starter/schema";
import type { PublishedPageSummary } from "./published-pages.ts";

export type PublishedPageSitemapEntry = {
  changeFrequency: "daily" | "weekly";
  lastModified: string;
  priority: number;
  url: string;
};

export function buildPublishedPageSitemapEntries(input: {
  locale: string;
  origin: string;
  pages: PublishedPageSummary[];
}): PublishedPageSitemapEntry[] {
  const seenUrls = new Set<string>();

  return input.pages.flatMap((page) => {
    const slug = normalizeSitemapSlug(page.slug);

    if (page.noIndex || isSystemPageSlug(slug)) {
      return [];
    }

    const url = `${input.origin}${getStorefrontHref(input.locale, slug)}`;

    if (seenUrls.has(url)) {
      return [];
    }

    seenUrls.add(url);

    return [
      {
        changeFrequency: slug === "home" ? "daily" : "weekly",
        lastModified: page.publishedAt ?? page.updatedAt,
        priority: slug === "home" ? 1 : 0.7,
        url,
      },
    ];
  });
}

function normalizeSitemapSlug(slug: string): string {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  return normalized || "home";
}

function isSystemPageSlug(slug: string): boolean {
  const leafSlug = slug.split("/").filter(Boolean).pop()?.toLowerCase();
  return leafSlug === "404";
}
