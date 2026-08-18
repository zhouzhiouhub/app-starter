import {
  createFallbackPage,
  pageSchema,
  type PageSchema
} from "@app-starter/schema";

const apiBaseUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

export async function getPublishedPage(input: {
  locale: string;
  slug: string;
}): Promise<PageSchema> {
  const fallbackLocale = process.env.FALLBACK_LOCALE ?? "en-US";
  const defaultMarket = process.env.DEFAULT_MARKET ?? "us";
  const locale = input.locale || fallbackLocale;
  const published = await fetchPublishedSchema(input.slug);

  if (published) {
    return published;
  }

  const home =
    input.slug === "home" ? null : await fetchPublishedSchema("home");

  return createFallbackPage({
    slug: input.slug,
    locale,
    market: defaultMarket,
    siteChrome: home?.chrome
  });
}

async function fetchPublishedSchema(slug: string): Promise<PageSchema | null> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/public/pages/${encodeURIComponent(slug)}`,
      {
        cache: "no-store"
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
