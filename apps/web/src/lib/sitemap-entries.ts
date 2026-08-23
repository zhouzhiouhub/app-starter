import { getStorefrontHref, pageSlugSchema } from "@app-starter/schema";
import type { PublishedPageSummary } from "./published-pages.ts";
import { readSafePublicOrigin } from "./safe-public-origin.ts";

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
  const origin = readSafePublicOrigin(input.origin);

  if (!origin) {
    return [];
  }

  return input.pages.flatMap((page) => {
    const slug = normalizeSitemapSlug(page.slug);

    if (
      page.noIndex ||
      !pageSlugSchema.safeParse(slug).success ||
      isSystemPageSlug(slug)
    ) {
      return [];
    }

    const lastModified = readSitemapLastModified(page);
    const url = `${origin}${getStorefrontHref(input.locale, slug)}`;

    if (!lastModified || seenUrls.has(url)) {
      return [];
    }

    seenUrls.add(url);

    return [
      {
        changeFrequency: slug === "home" ? "daily" : "weekly",
        lastModified,
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

function readSitemapLastModified(page: PublishedPageSummary): string | null {
  return (
    readIsoDateString(page.publishedAt) ?? readIsoDateString(page.updatedAt)
  );
}

function readIsoDateString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
