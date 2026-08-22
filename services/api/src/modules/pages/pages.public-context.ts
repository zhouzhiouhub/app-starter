import type { PageSchema } from "@app-starter/schema";

export interface PublishedPageContext {
  locale: string;
  market: string;
  siteHost?: string | null;
}

export function matchesPublishedPageContext(
  schema: PageSchema,
  context: PublishedPageContext,
): boolean {
  return (
    schema.meta.locale === context.locale &&
    schema.meta.market === context.market
  );
}
