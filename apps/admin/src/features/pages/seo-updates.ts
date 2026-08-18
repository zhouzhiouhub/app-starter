import type { PageSchema } from "@app-starter/schema";

export type SeoField = "canonical" | "description" | "ogImage" | "title";

export function updateSeoField(
  current: PageSchema,
  field: SeoField,
  value: string,
): PageSchema {
  return {
    ...current,
    seo: {
      ...current.seo,
      [field]: value,
    },
  };
}
