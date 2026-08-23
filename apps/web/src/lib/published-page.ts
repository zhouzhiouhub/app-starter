import {
  createFallbackPage,
  getPublishedPageCacheTags,
  pageSchema,
  pageSlugSchema,
  publishedPageRevalidateSeconds,
  type PageSchema,
} from "@app-starter/schema";
import {
  readWebRuntimeDefaults,
  resolveWebLocale,
} from "./runtime-defaults.ts";
import { getApiBaseUrl } from "./runtime-url.ts";
import {
  addStorefrontHostCacheParam,
  createStorefrontHostHeaders,
} from "./storefront-host-header.ts";
import { isPreviewTokenCandidate } from "./preview-token-param.ts";

const apiBaseUrl = getApiBaseUrl();

export async function getPublishedPage(input: {
  locale: string;
  slug: string;
  storefrontHost?: string | null;
}): Promise<PageSchema | null> {
  const defaults = readWebRuntimeDefaults();
  const locale = resolveWebLocale(input.locale, defaults);
  const slug = pageSlugSchema.safeParse(input.slug);

  if (!locale || !slug.success) {
    return null;
  }

  return fetchPublishedSchema({
    defaultLocale: defaults.defaultLocale,
    fallbackLocale: defaults.fallbackLocale,
    locale,
    market: defaults.defaultMarket,
    slug: slug.data,
    storefrontHost: input.storefrontHost,
  });
}

export async function getNotFoundPage(input?: {
  locale?: string;
  storefrontHost?: string | null;
}): Promise<PageSchema> {
  const defaults = readWebRuntimeDefaults();
  const locale =
    resolveWebLocale(input?.locale, defaults) ?? defaults.defaultLocale;
  const published = await fetchPublishedSchema({
    defaultLocale: defaults.defaultLocale,
    fallbackLocale: defaults.fallbackLocale,
    locale,
    market: defaults.defaultMarket,
    slug: "404",
    storefrontHost: input?.storefrontHost,
  });

  if (published) {
    return published;
  }

  const home = await fetchPublishedSchema({
    defaultLocale: defaults.defaultLocale,
    fallbackLocale: defaults.fallbackLocale,
    locale,
    market: defaults.defaultMarket,
    slug: "home",
    storefrontHost: input?.storefrontHost,
  });

  return createFallbackPage({
    slug: "404",
    locale,
    market: defaults.defaultMarket,
    siteChrome: home?.chrome,
  });
}

export async function getPreviewPage(
  token: string,
  input?: {
    storefrontHost?: string | null;
  },
): Promise<PageSchema | null> {
  if (!isPreviewTokenCandidate(token)) {
    return null;
  }

  try {
    const headers = createStorefrontHostHeaders(input?.storefrontHost);
    const response = await fetch(
      `${apiBaseUrl}/public/preview/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        ...(headers ? { headers } : {}),
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { data?: unknown };
    return readPreviewSchema(result);
  } catch {
    return null;
  }
}

function readPreviewSchema(result: {
  data?: unknown;
  meta?: unknown;
}): PageSchema | null {
  const parsed = pageSchema.safeParse(result.data);

  if (!parsed.success || !isMatchingPreviewMeta(result.meta, parsed.data)) {
    return null;
  }

  return parsed.data;
}

function isMatchingPreviewMeta(meta: unknown, schema: PageSchema): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return false;
  }

  const record = meta as Record<string, unknown>;
  return record.preview === true && record.slug === schema.meta.slug;
}

async function fetchPublishedSchema(input: {
  defaultLocale: string;
  fallbackLocale: string;
  locale: string;
  market: string;
  slug: string;
  storefrontHost?: string | null;
}): Promise<PageSchema | null> {
  try {
    const searchParams = new URLSearchParams({
      locale: input.locale,
      market: input.market,
    });
    addStorefrontHostCacheParam(searchParams, input.storefrontHost);

    const response = await fetch(
      `${apiBaseUrl}/public/pages/${encodeURIComponent(input.slug)}?${searchParams}`,
      {
        headers: createStorefrontHostHeaders(input.storefrontHost),
        next: {
          revalidate: publishedPageRevalidateSeconds,
          tags: getPublishedPageCacheTags({
            fallbackLocale: input.fallbackLocale,
            locale: input.locale,
            market: input.market,
            siteHost: input.storefrontHost,
            slug: input.slug,
          }),
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { data?: unknown };
    return readMatchingPublishedSchema(result, input);
  } catch {
    return null;
  }
}

function readMatchingPublishedSchema(
  result: { data?: unknown; meta?: unknown },
  input: {
    defaultLocale: string;
    locale: string;
    market: string;
    slug: string;
  },
): PageSchema | null {
  const parsed = pageSchema.safeParse(result.data);

  if (!parsed.success) {
    return null;
  }

  const schema = parsed.data;
  if (schema.meta.slug !== input.slug || schema.meta.market !== input.market) {
    return null;
  }

  if (schema.meta.locale === input.locale) {
    return schema;
  }

  if (
    schema.meta.locale === input.defaultLocale &&
    isDeclaredLocaleFallback(result.meta, input.defaultLocale)
  ) {
    return schema;
  }

  return null;
}

function isDeclaredLocaleFallback(
  meta: unknown,
  defaultLocale: string,
): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return false;
  }

  const record = meta as Record<string, unknown>;
  return record.isFallback === true && record.locale === defaultLocale;
}
