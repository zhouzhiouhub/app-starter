import {
  createFallbackPage,
  getPublishedPageCacheTags,
  pageSchema,
  pageSlugSchema,
  publishedPageRevalidateSeconds,
  type PageSchema
} from "@app-starter/schema";

const apiBaseUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

export async function getPublishedPage(input: {
  locale: string;
  slug: string;
}): Promise<PageSchema | null> {
  const defaultMarket = process.env.DEFAULT_MARKET ?? "us";
  const locale = input.locale || (process.env.FALLBACK_LOCALE ?? "en-US");
  const slug = pageSlugSchema.safeParse(input.slug);

  if (!slug.success) {
    return null;
  }

  return fetchPublishedSchema({
    locale,
    market: defaultMarket,
    slug: slug.data
  });
}

export async function getNotFoundPage(input?: {
  locale?: string;
}): Promise<PageSchema> {
  const defaultMarket = process.env.DEFAULT_MARKET ?? "us";
  const locale =
    input?.locale || (process.env.FALLBACK_LOCALE ?? "en-US");
  const published = await fetchPublishedSchema({
    locale,
    market: defaultMarket,
    slug: "404"
  });

  if (published) {
    return published;
  }

  const home = await fetchPublishedSchema({
    locale,
    market: defaultMarket,
    slug: "home"
  });

  return createFallbackPage({
    slug: "404",
    locale,
    market: defaultMarket,
    siteChrome: home?.chrome
  });
}

async function fetchPublishedSchema(input: {
  locale: string;
  market: string;
  slug: string;
}): Promise<PageSchema | null> {
  try {
    const searchParams = new URLSearchParams({
      locale: input.locale,
      market: input.market
    });
    const response = await fetch(
      `${apiBaseUrl}/public/pages/${encodeURIComponent(input.slug)}?${searchParams}`,
      {
        next: {
          revalidate: publishedPageRevalidateSeconds,
          tags: getPublishedPageCacheTags(input)
        }
      }
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
