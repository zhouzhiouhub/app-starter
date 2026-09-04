import { z } from "zod";
import { i18nTextSchema } from "./foundation.js";
import { chromeBrandSchema } from "./page-chrome-brand.js";
import {
  createDefaultHeaderChromeContent,
  createDefaultHeaderNavigation,
  createDefaultLocaleSwitcher,
} from "./page-chrome-defaults.js";
import {
  chromeLocaleOptionSchema,
  chromeNavigationItemSchema,
} from "./page-chrome-navigation.js";
import { pageChromeRegionBaseObjectSchema } from "./page-chrome-region.js";

export const headerLocaleSwitcherSchema = z
  .object({
    enabled: z.boolean().default(true),
    label: i18nTextSchema.default({ defaultValue: "Language" }),
    locales: z
      .array(chromeLocaleOptionSchema)
      .default(() => createDefaultLocaleSwitcher().locales),
  })
  .default(() => createDefaultLocaleSwitcher());
export type HeaderLocaleSwitcher = z.infer<typeof headerLocaleSwitcherSchema>;

export const headerChromeContentSchema = z
  .object({
    brand: chromeBrandSchema,
    navigation: z
      .array(chromeNavigationItemSchema)
      .default(() => createDefaultHeaderNavigation()),
    localeSwitcher: headerLocaleSwitcherSchema,
  })
  .default(() => createDefaultHeaderChromeContent());
export type HeaderChromeContent = z.infer<typeof headerChromeContentSchema>;

export const pageHeaderChromeSchema = pageChromeRegionBaseObjectSchema
  .extend({
    content: headerChromeContentSchema,
  })
  .default(() => ({
    enabled: true,
    variant: "default" as const,
    content: headerChromeContentSchema.parse({}),
  }));
export type PageHeaderChromeSettings = z.infer<typeof pageHeaderChromeSchema>;
