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

export const headerLocaleSwitcherSchema = z
  .object({
    enabled: z.boolean().default(true),
    label: i18nTextSchema.default({ defaultValue: "Language" }),
    locales: z.array(chromeLocaleOptionSchema).default([
      {
        code: "en-US",
        label: { defaultValue: "English" },
      },
    ]),
  })
  .default({
    enabled: true,
    label: { defaultValue: "Language" },
    locales: [
      {
        code: "en-US",
        label: { defaultValue: "English" },
      },
    ],
  });
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
      .default({
        label: { defaultValue: "App Starter" },
        href: "/",
      }),
    navigation: z.array(chromeNavigationItemSchema).default([
      {
        id: "home",
        label: { defaultValue: "Home" },
        href: "/",
      },
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en/privacy",
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en/terms",
      },
    ]),
    localeSwitcher: headerLocaleSwitcherSchema,
  })
  .default({
    brand: {
      label: { defaultValue: "App Starter" },
      href: "/",
    },
    navigation: [
      {
        id: "home",
        label: { defaultValue: "Home" },
        href: "/",
      },
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en/privacy",
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en/terms",
      },
    ],
    localeSwitcher: headerLocaleSwitcherSchema.parse({}),
  });
export type HeaderChromeContent = z.infer<typeof headerChromeContentSchema>;

export const footerChromeContentSchema = z
  .object({
    brand: z
      .object({
        label: i18nTextSchema,
        href: safeHrefSchema.default("/"),
      })
      .default({
        label: { defaultValue: "App Starter" },
        href: "/",
      }),
    copyright: i18nTextSchema.default({
      defaultValue: "(c) 2026 App Starter. All rights reserved.",
    }),
    navigation: z.array(chromeNavigationItemSchema).default([
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en/privacy",
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en/terms",
      },
      {
        id: "contact",
        label: { defaultValue: "Contact" },
        href: "/en/contact",
      },
    ]),
  })
  .default({
    brand: {
      label: { defaultValue: "App Starter" },
      href: "/",
    },
    copyright: {
      defaultValue: "(c) 2026 App Starter. All rights reserved.",
    },
    navigation: [
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en/privacy",
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en/terms",
      },
      {
        id: "contact",
        label: { defaultValue: "Contact" },
        href: "/en/contact",
      },
    ],
  });
export type FooterChromeContent = z.infer<typeof footerChromeContentSchema>;

export const pageChromeRegionBaseObjectSchema = z.object({
  enabled: z.boolean().default(true),
  variant: chromeVariantSchema.default("default"),
});

export const pageChromeRegionBaseSchema =
  pageChromeRegionBaseObjectSchema.default({
    enabled: true,
    variant: "default",
  });

export const pageHeaderChromeSchema = pageChromeRegionBaseObjectSchema
  .extend({
    content: headerChromeContentSchema,
  })
  .default({
    enabled: true,
    variant: "default",
    content: headerChromeContentSchema.parse({}),
  });
export type PageHeaderChromeSettings = z.infer<
  typeof pageHeaderChromeSchema
>;

export const pageFooterChromeSchema = pageChromeRegionBaseObjectSchema
  .extend({
    content: footerChromeContentSchema,
  })
  .default({
    enabled: true,
    variant: "default",
    content: footerChromeContentSchema.parse({}),
  });
export type PageFooterChromeSettings = z.infer<
  typeof pageFooterChromeSchema
>;

export type PageChromeRegion =
  | PageHeaderChromeSettings
  | PageFooterChromeSettings;

export const pageChromeSchema = z
  .object({
    header: pageHeaderChromeSchema,
    footer: pageFooterChromeSchema,
  })
  .default({
    header: {
      enabled: true,
      variant: "default",
      content: headerChromeContentSchema.parse({}),
    },
    footer: {
      enabled: true,
      variant: "default",
      content: footerChromeContentSchema.parse({}),
    },
  });
export type PageChromeSettings = z.infer<typeof pageChromeSchema>;
