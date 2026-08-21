import { z } from "zod";

export const localeCodeSchema = z
  .string()
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "Locale must look like en-US");

export function toStorefrontPathPrefix(locale: string): string {
  const language = locale.split("-")[0];
  return (language ?? locale).toLowerCase();
}

export function getStorefrontHref(locale: string, slug = "home"): string {
  const prefix = toStorefrontPathPrefix(locale);
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, "");

  if (!normalizedSlug || normalizedSlug === "home") {
    return `/${prefix}`;
  }

  return `/${prefix}/${normalizedSlug}`;
}

export const publishedPageRevalidateSeconds = 60;
export const publishedPagesCacheTag = "published-page";
export const storefrontRevalidateSecretHeader =
  "x-storefront-revalidate-secret";

export function getPublishedPageCacheTags(input: {
  fallbackLocale?: string;
  fallbackMarket?: string;
  locale: string;
  market: string;
  slug: string;
}): string[] {
  const slug = normalizePageSlugForCache(input.slug);
  const contexts = [
    {
      locale: input.locale,
      market: input.market,
    },
    {
      locale: input.fallbackLocale ?? input.locale,
      market: input.fallbackMarket ?? input.market,
    },
  ];

  return [
    publishedPagesCacheTag,
    ...contexts.flatMap((context) => [
      `published-page:${context.market}:${context.locale}`,
      `published-page:${context.market}:${context.locale}:${slug}`,
    ]),
  ].filter((tag, index, tags) => tags.indexOf(tag) === index);
}

export function getPublishedPageRevalidationPaths(input: {
  locale: string;
  slug: string;
}): string[] {
  const slug = normalizePageSlugForCache(input.slug);
  const path = getStorefrontHref(input.locale, slug);

  if (slug === "home") {
    return Array.from(new Set(["/", path]));
  }

  return [path];
}

export function rewriteStorefrontHref(href: string): string {
  return href.replace(
    /^\/([a-z]{2})-[A-Z]{2}(?=\/|$)/,
    (_match, language: string) => `/${language}`,
  );
}

export function resolveLocaleFromPath(
  pathLocale: string,
  defaultLocale = "en-US",
): string {
  if (!pathLocale) {
    return defaultLocale;
  }

  if (pathLocale === defaultLocale) {
    return defaultLocale;
  }

  if (
    toStorefrontPathPrefix(defaultLocale) ===
    toStorefrontPathPrefix(pathLocale)
  ) {
    return defaultLocale;
  }

  return pathLocale;
}

function normalizePageSlugForCache(slug: string): string {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  return normalized || "home";
}
