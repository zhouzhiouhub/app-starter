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

const apiBaseUrl = getApiBaseUrl();
const maxPreviewTokenLength = 2048;
const previewTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

export async function getPublishedPage(input: {
  locale: string;
  slug: string;
}): Promise<PageSchema | null> {
  const defaults = readWebRuntimeDefaults();
  const locale = resolveWebLocale(input.locale, defaults);
  const slug = pageSlugSchema.safeParse(input.slug);

  if (!locale || !slug.success) {
    return null;
  }

  return fetchPublishedSchema({
    fallbackLocale: defaults.fallbackLocale,
    locale,
    market: defaults.defaultMarket,
    slug: slug.data,
  });
}

export async function getNotFoundPage(input?: {
  locale?: string;
}): Promise<PageSchema> {
  const defaults = readWebRuntimeDefaults();
  const locale =
    resolveWebLocale(input?.locale, defaults) ?? defaults.defaultLocale;
  const published = await fetchPublishedSchema({
    fallbackLocale: defaults.fallbackLocale,
    locale,
    market: defaults.defaultMarket,
    slug: "404",
  });

  if (published) {
    return published;
  }

  const home = await fetchPublishedSchema({
    fallbackLocale: defaults.fallbackLocale,
    locale,
    market: defaults.defaultMarket,
    slug: "home",
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
): Promise<PageSchema | null> {
  if (!isPreviewTokenCandidate(token)) {
    return null;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/public/preview/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { data?: unknown };
    return pageSchema.parse(result.data);
  } catch {
    return null;
  }
}

function isPreviewTokenCandidate(token: string): boolean {
  return (
    token.length <= maxPreviewTokenLength &&
    token.trim() === token &&
    previewTokenPattern.test(token)
  );
}

async function fetchPublishedSchema(input: {
  fallbackLocale: string;
  locale: string;
  market: string;
  slug: string;
}): Promise<PageSchema | null> {
  try {
    const searchParams = new URLSearchParams({
      locale: input.locale,
      market: input.market,
    });
    const response = await fetch(
      `${apiBaseUrl}/public/pages/${encodeURIComponent(input.slug)}?${searchParams}`,
      {
        next: {
          revalidate: publishedPageRevalidateSeconds,
          tags: getPublishedPageCacheTags(input),
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { data?: unknown };
    return pageSchema.parse(result.data);
  } catch {
    return null;
  }
}
