import { z } from "zod";
import { i18nTextSchema } from "./foundation.js";
import { chromeBrandSchema } from "./page-chrome-brand.js";
import {
  createDefaultFooterChromeContent,
  createDefaultFooterCopyright,
  createDefaultFooterNavigation,
} from "./page-chrome-defaults.js";
import { chromeNavigationItemSchema } from "./page-chrome-navigation.js";
import { pageChromeRegionBaseObjectSchema } from "./page-chrome-region.js";

export const footerChromeContentSchema = z
  .object({
    brand: chromeBrandSchema,
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
export type PageFooterChromeSettings = z.infer<typeof pageFooterChromeSchema>;
