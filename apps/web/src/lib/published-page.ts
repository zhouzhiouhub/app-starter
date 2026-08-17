import { exampleLandingPage, pageSchema, type PageSchema } from "@app-starter/schema";

export async function getPublishedPage(input: {
  locale: string;
  slug: string;
}): Promise<PageSchema | null> {
  const fallbackLocale = process.env.FALLBACK_LOCALE ?? "en-US";
  const defaultMarket = process.env.DEFAULT_MARKET ?? "us";

  return pageSchema.parse({
    ...exampleLandingPage,
    meta: {
      ...exampleLandingPage.meta,
      slug: input.slug,
      locale: input.locale || fallbackLocale,
      market: defaultMarket
    }
  });
}
