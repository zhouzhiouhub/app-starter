import { z } from "zod";
import { i18nTextSchema, safeHrefSchema } from "./foundation.js";
import {
  createDefaultChromeBrand,
  createDefaultFooterChromeContent,
  createDefaultFooterCopyright,
  createDefaultFooterNavigation,
} from "./page-chrome-defaults.js";
import { chromeNavigationItemSchema } from "./page-chrome-navigation.js";
import { pageChromeRegionBaseObjectSchema } from "./page-chrome-region.js";

export const footerChromeContentSchema = z
  .object({
    brand: z
      .object({
        label: i18nTextSchema,
        href: safeHrefSchema.default("/"),
      })
      .default(() => createDefaultChromeBrand()),
    copyright: i18nTextSchema.default(() => createDefaultFooterCopyright()),
    navigation: z
      .array(chromeNavigationItemSchema)
      .default(() => createDefaultFooterNavigation()),
  })
  .default(() => createDefaultFooterChromeContent());
export type FooterChromeContent = z.infer<typeof footerChromeContentSchema>;

export const pageFooterChromeSchema = pageChromeRegionBaseObjectSchema
  .extend({
    content: footerChromeContentSchema,
  })
  .default(() => ({
    enabled: true,
    variant: "default" as const,
    content: footerChromeContentSchema.parse({}),
  }));
export type PageFooterChromeSettings = z.infer<
  typeof pageFooterChromeSchema
>;
