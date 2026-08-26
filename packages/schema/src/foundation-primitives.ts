import { z } from "zod";
import { translationKeySchema } from "./foundation-translations.js";

export const viewportSchema = z.enum(["desktop", "mobile"]);
export type Viewport = z.infer<typeof viewportSchema>;

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
  i18nKey: translationKeySchema.optional(),
  defaultValue: z.string(),
});
export type I18nText = z.infer<typeof i18nTextSchema>;
