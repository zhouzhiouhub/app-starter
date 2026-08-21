import { z } from "zod";
import { i18nTextSchema, safeHrefSchema } from "./foundation.js";
import {
  createDefaultChromeBrand,
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
export type HeaderLocaleSwitcher = z.infer<
  typeof headerLocaleSwitcherSchema
>;

export const headerChromeContentSchema = z
  .object({
    brand: z
      .object({
        label: i18nTextSchema,
        href: safeHrefSchema.default("/"),
      })
      .default(() => createDefaultChromeBrand()),
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
export type PageHeaderChromeSettings = z.infer<
  typeof pageHeaderChromeSchema
>;
