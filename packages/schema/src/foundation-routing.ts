import { z } from "zod";
import { readSiteDomainHeader } from "./site-domain.js";

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
export const publicTranslationsCacheTag = "public-translation";
export const storefrontRevalidateSecretHeader =
  "x-storefront-revalidate-secret";

export type PublishedPageCacheInput = {
  fallbackLocale?: string;
  fallbackMarket?: string;
  locale: string;
  market: string;
  siteHost?: string | null;
};

export function getPublishedPagesCacheTags(
  input: PublishedPageCacheInput,
): string[] {
  const root = readPublishedPageCacheTagRoot(input.siteHost);
  const contexts = readCacheContexts(input);

  return [
    root,
    ...contexts.map((context) => `${root}:${context.market}:${context.locale}`),
  ].filter(uniqueTag);
}

export function getPublishedPageCacheTags(input: {
  fallbackLocale?: string;
  fallbackMarket?: string;
  locale: string;
  market: string;
  siteHost?: string | null;
  slug: string;
}): string[] {
  const slug = normalizePageSlugForCache(input.slug);
  const root = readPublishedPageCacheTagRoot(input.siteHost);
  const contexts = readCacheContexts(input);

  return [
    root,
    ...contexts.flatMap((context) => [
      `${root}:${context.market}:${context.locale}`,
      `${root}:${context.market}:${context.locale}:${slug}`,
    ]),
  ].filter(uniqueTag);
}

export function getPublicTranslationCacheTags(input: {
  fallbackLocale?: string;
  locale: string;
  siteHost?: string | null;
}): string[] {
  const root = readCacheTagRoot(publicTranslationsCacheTag, input.siteHost);
  const locales = [input.locale, input.fallbackLocale ?? input.locale];

  return [root, ...locales.map((locale) => `${root}:${locale}`)].filter(
    uniqueTag,
  );
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
    toStorefrontPathPrefix(defaultLocale) === toStorefrontPathPrefix(pathLocale)
  ) {
    return defaultLocale;
  }

  return pathLocale;
}

function normalizePageSlugForCache(slug: string): string {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  return normalized || "home";
}

function readCacheContexts(input: PublishedPageCacheInput): {
  locale: string;
  market: string;
}[] {
  return [
    {
      locale: input.locale,
      market: input.market,
    },
    {
      locale: input.fallbackLocale ?? input.locale,
      market: input.fallbackMarket ?? input.market,
    },
  ];
}

function readPublishedPageCacheTagRoot(siteHost?: string | null): string {
  return readCacheTagRoot(publishedPagesCacheTag, siteHost);
}

function readCacheTagRoot(root: string, siteHost?: string | null): string {
  const host = readCacheSiteHost(siteHost);

  if (!host) {
    return root;
  }

  return `${root}:site:${createCacheHash(host)}`;
}

function readCacheSiteHost(siteHost?: string | null): string | null {
  const host = readSiteDomainHeader(siteHost);

  if (!host) {
    return null;
  }

  if (host === "localhost" || host.startsWith("localhost:")) {
    return "localhost";
  }

  return host;
}

function createCacheHash(value: string): string {
  let first = 2166136261;
  let second = 2166136261 ^ 0x9e3779b9;

  for (const char of value) {
    const code = char.charCodeAt(0);
    first ^= code;
    first = Math.imul(first, 16777619);
    second ^= code;
    second = Math.imul(second, 16777619);
  }

  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function uniqueTag(tag: string, index: number, tags: string[]): boolean {
  return tags.indexOf(tag) === index;
}
