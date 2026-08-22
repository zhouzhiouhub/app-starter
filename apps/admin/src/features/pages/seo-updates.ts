import type { PageSchema } from "@app-starter/schema";

export type SeoField = "canonical" | "description" | "ogImage" | "title";
type OptionalSeoUrlField = Extract<SeoField, "canonical" | "ogImage">;

export function updateSeoField(
  current: PageSchema,
  field: SeoField,
  value: string,
): PageSchema {
  if (isOptionalSeoUrlField(field) && !value.trim()) {
    const seo = { ...current.seo };
    delete seo[field];

    return {
      ...current,
      seo,
    };
  }

  return {
    ...current,
    seo: {
      ...current.seo,
      [field]: value,
    },
  };
}

function isOptionalSeoUrlField(field: SeoField): field is OptionalSeoUrlField {
  return field === "canonical" || field === "ogImage";
}

export function updateSeoNoIndex(
  current: PageSchema,
  noIndex: boolean,
): PageSchema {
  return {
    ...current,
    seo: {
      ...current.seo,
      noIndex,
    },
  };
}
