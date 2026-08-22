import { z } from "zod";
import {
  i18nTextSchema,
  localeCodeSchema,
  safeHrefSchema,
} from "./foundation.js";

export const chromeVariantSchema = z.enum(["default", "minimal"]);
export type ChromeVariant = z.infer<typeof chromeVariantSchema>;

export const chromeNavigationItemSchema = z.object({
  id: z.string().min(1),
  label: i18nTextSchema,
  href: safeHrefSchema,
  openInNewTab: z.boolean().default(false),
});
export type ChromeNavigationItem = z.infer<
  typeof chromeNavigationItemSchema
>;

export const chromeLocaleOptionSchema = z.object({
  code: localeCodeSchema,
  label: i18nTextSchema,
  href: safeHrefSchema.optional(),
});
export type ChromeLocaleOption = z.infer<typeof chromeLocaleOptionSchema>;
