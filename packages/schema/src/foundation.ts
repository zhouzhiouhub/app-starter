import { z } from "zod";
import { mediaAssetReferenceSchema } from "./media-reference.js";

export const viewportSchema = z.enum(["desktop", "mobile"]);
export type Viewport = z.infer<typeof viewportSchema>;

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
    toStorefrontPathPrefix(defaultLocale) ===
    toStorefrontPathPrefix(pathLocale)
  ) {
    return defaultLocale;
  }

  return pathLocale;
}

export const marketCodeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,15}$/, "Market code must be lowercase");

export const pageSlugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(
    /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, hyphens, or slashes",
  );
export type PageSlug = z.infer<typeof pageSlugSchema>;

export const i18nTextSchema = z.object({
  i18nKey: z.string().min(1).optional(),
  defaultValue: z.string(),
});
export type I18nText = z.infer<typeof i18nTextSchema>;

export const safeHrefSchema = z
  .string()
  .min(1)
  .regex(
    /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/,
    "Href must be relative, http(s), mailto, tel, or hash",
  );
export type SafeHref = z.infer<typeof safeHrefSchema>;

export const seoUrlSchema = z
  .string()
  .min(1)
  .regex(
    /^(\/(?!\/)|https?:\/\/)/,
    "SEO URL must be relative or http(s)",
  );
export type SeoUrl = z.infer<typeof seoUrlSchema>;

export const seoImageUrlSchema = z.union([
  seoUrlSchema,
  mediaAssetReferenceSchema,
]);
export type SeoImageUrl = z.infer<typeof seoImageUrlSchema>;

export const layoutBoxSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive().optional(),
  padding: z.string().optional(),
  gap: z.string().optional(),
});
export type LayoutBox = z.infer<typeof layoutBoxSchema>;

export const sectionNodeSchema = z.object({
  id: z.string().min(1),
  component: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  layout: z.object({
    desktop: layoutBoxSchema.optional(),
    mobile: layoutBoxSchema.optional(),
  }),
  visibility: z
    .object({
      desktop: z.boolean().default(true),
      mobile: z.boolean().default(true),
    })
    .default({ desktop: true, mobile: true }),
  analytics: z.record(z.unknown()).optional(),
});
export type SectionNode = z.infer<typeof sectionNodeSchema>;

export const seoConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  ogImage: seoImageUrlSchema.optional(),
  canonical: seoUrlSchema.optional(),
});
export type SeoConfig = z.infer<typeof seoConfigSchema>;

export const analyticsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dataLayerName: z.string().default("dataLayer"),
});
export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;
