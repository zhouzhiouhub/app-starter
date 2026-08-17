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
}): Promise<PageSchema | null> {
  const fallbackLocale = process.env.FALLBACK_LOCALE ?? "en-US";
  const defaultMarket = process.env.DEFAULT_MARKET ?? "us";

  try {
    const response = await fetch(
      `${apiBaseUrl}/public/pages/${encodeURIComponent(input.slug)}`,
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
    return createFallbackPage({
      slug: input.slug,
      locale: input.locale || fallbackLocale,
      market: defaultMarket
    });
  }
}
