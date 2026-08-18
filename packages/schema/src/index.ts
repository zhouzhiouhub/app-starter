import { z } from "zod";

export const viewportSchema = z.enum(["desktop", "mobile"]);
export type Viewport = z.infer<typeof viewportSchema>;

export const localeCodeSchema = z
  .string()
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "Locale must look like en-US");

export const marketCodeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,15}$/, "Market code must be lowercase");

export const i18nTextSchema = z.object({
  i18nKey: z.string().min(1).optional(),
  defaultValue: z.string()
});
export type I18nText = z.infer<typeof i18nTextSchema>;

export const safeHrefSchema = z
  .string()
  .min(1)
  .regex(
    /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/,
    "Href must be relative, http(s), mailto, tel, or hash"
  );
export type SafeHref = z.infer<typeof safeHrefSchema>;

export const layoutBoxSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive().optional(),
  padding: z.string().optional(),
  gap: z.string().optional()
});
export type LayoutBox = z.infer<typeof layoutBoxSchema>;

export const sectionNodeSchema = z.object({
  id: z.string().min(1),
  component: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  layout: z.object({
    desktop: layoutBoxSchema.optional(),
    mobile: layoutBoxSchema.optional()
  }),
  visibility: z
    .object({
      desktop: z.boolean().default(true),
      mobile: z.boolean().default(true)
    })
    .default({ desktop: true, mobile: true }),
  analytics: z.record(z.unknown()).optional()
});
export type SectionNode = z.infer<typeof sectionNodeSchema>;

export const seoConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  ogImage: z.string().optional(),
  canonical: z.string().optional()
});
export type SeoConfig = z.infer<typeof seoConfigSchema>;

export const analyticsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dataLayerName: z.string().default("dataLayer")
});
export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;

export const pageTemplateIdSchema = z.enum([
  "default",
  "landing-blank",
  "policy"
]);
export type PageTemplateId = z.infer<typeof pageTemplateIdSchema>;

export const chromeVariantSchema = z.enum(["default", "minimal"]);
export type ChromeVariant = z.infer<typeof chromeVariantSchema>;

export const chromeNavigationItemSchema = z.object({
  id: z.string().min(1),
  label: i18nTextSchema,
  href: safeHrefSchema,
  openInNewTab: z.boolean().default(false)
});
export type ChromeNavigationItem = z.infer<typeof chromeNavigationItemSchema>;

export const chromeLocaleOptionSchema = z.object({
  code: localeCodeSchema,
  label: i18nTextSchema,
  href: safeHrefSchema.optional()
});
export type ChromeLocaleOption = z.infer<typeof chromeLocaleOptionSchema>;

export const headerLocaleSwitcherSchema = z
  .object({
    enabled: z.boolean().default(true),
    label: i18nTextSchema.default({ defaultValue: "Language" }),
    locales: z.array(chromeLocaleOptionSchema).default([
      {
        code: "en-US",
        label: { defaultValue: "English" }
      }
    ])
  })
  .default({
    enabled: true,
    label: { defaultValue: "Language" },
    locales: [
      {
        code: "en-US",
        label: { defaultValue: "English" }
      }
    ]
  });
export type HeaderLocaleSwitcher = z.infer<typeof headerLocaleSwitcherSchema>;

export const headerChromeContentSchema = z
  .object({
    brand: z
      .object({
        label: i18nTextSchema,
        href: safeHrefSchema.default("/")
      })
      .default({
        label: { defaultValue: "App Starter" },
        href: "/"
      }),
    navigation: z.array(chromeNavigationItemSchema).default([
      {
        id: "home",
        label: { defaultValue: "Home" },
        href: "/"
      },
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en-US/privacy"
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en-US/terms"
      }
    ]),
    localeSwitcher: headerLocaleSwitcherSchema
  })
  .default({
    brand: {
      label: { defaultValue: "App Starter" },
      href: "/"
    },
    navigation: [
      {
        id: "home",
        label: { defaultValue: "Home" },
        href: "/"
      },
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en-US/privacy"
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en-US/terms"
      }
    ],
    localeSwitcher: headerLocaleSwitcherSchema.parse({})
  });
export type HeaderChromeContent = z.infer<typeof headerChromeContentSchema>;

export const footerChromeContentSchema = z
  .object({
    brand: z
      .object({
        label: i18nTextSchema,
        href: safeHrefSchema.default("/")
      })
      .default({
        label: { defaultValue: "App Starter" },
        href: "/"
      }),
    copyright: i18nTextSchema.default({
      defaultValue: "© 2026 App Starter. All rights reserved."
    }),
    navigation: z.array(chromeNavigationItemSchema).default([
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en-US/privacy"
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en-US/terms"
      },
      {
        id: "contact",
        label: { defaultValue: "Contact" },
        href: "/en-US/contact"
      }
    ])
  })
  .default({
    brand: {
      label: { defaultValue: "App Starter" },
      href: "/"
    },
    copyright: {
      defaultValue: "© 2026 App Starter. All rights reserved."
    },
    navigation: [
      {
        id: "privacy",
        label: { defaultValue: "Privacy" },
        href: "/en-US/privacy"
      },
      {
        id: "terms",
        label: { defaultValue: "Terms" },
        href: "/en-US/terms"
      },
      {
        id: "contact",
        label: { defaultValue: "Contact" },
        href: "/en-US/contact"
      }
    ]
  });
export type FooterChromeContent = z.infer<typeof footerChromeContentSchema>;

export const pageChromeRegionBaseObjectSchema = z.object({
  enabled: z.boolean().default(true),
  variant: chromeVariantSchema.default("default")
});

export const pageChromeRegionBaseSchema = pageChromeRegionBaseObjectSchema.default({
  enabled: true,
  variant: "default"
});

export const pageHeaderChromeSchema = pageChromeRegionBaseObjectSchema
  .extend({
    content: headerChromeContentSchema
  })
  .default({
    enabled: true,
    variant: "default",
    content: headerChromeContentSchema.parse({})
  });
export type PageHeaderChromeSettings = z.infer<typeof pageHeaderChromeSchema>;

export const pageFooterChromeSchema = pageChromeRegionBaseObjectSchema
  .extend({
    content: footerChromeContentSchema
  })
  .default({
    enabled: true,
    variant: "default",
    content: footerChromeContentSchema.parse({})
  });
export type PageFooterChromeSettings = z.infer<typeof pageFooterChromeSchema>;

export type PageChromeRegion =
  | PageHeaderChromeSettings
  | PageFooterChromeSettings;

export const pageChromeSchema = z
  .object({
    header: pageHeaderChromeSchema,
    footer: pageFooterChromeSchema
  })
  .default({
    header: {
      enabled: true,
      variant: "default",
      content: headerChromeContentSchema.parse({})
    },
    footer: {
      enabled: true,
      variant: "default",
      content: footerChromeContentSchema.parse({})
    }
  });
export type PageChromeSettings = z.infer<typeof pageChromeSchema>;

export const pageTemplateSchema = z
  .object({
    id: pageTemplateIdSchema.default("default")
  })
  .default({ id: "default" });
export type PageTemplateSettings = z.infer<typeof pageTemplateSchema>;

export const pageTemplatePresets = {
  default: {
    id: "default",
    label: "Default",
    description: "Standard storefront page with header and footer.",
    chrome: pageChromeSchema.parse({
      header: { enabled: true, variant: "default" },
      footer: { enabled: true, variant: "default" }
    })
  },
  "landing-blank": {
    id: "landing-blank",
    label: "Landing blank",
    description: "Campaign page without global header or footer.",
    chrome: pageChromeSchema.parse({
      header: { enabled: false, variant: "minimal" },
      footer: { enabled: false, variant: "minimal" }
    })
  },
  policy: {
    id: "policy",
    label: "Policy",
    description: "Policy page with the standard header and footer.",
    chrome: pageChromeSchema.parse({
      header: { enabled: true, variant: "default" },
      footer: { enabled: true, variant: "default" }
    })
  }
} satisfies Record<
  PageTemplateId,
  {
    id: PageTemplateId;
    label: string;
    description: string;
    chrome: PageChromeSettings;
  }
>;

export function getPageTemplateChrome(
  templateId: PageTemplateId
): PageChromeSettings {
  return pageChromeSchema.parse(pageTemplatePresets[templateId].chrome);
}

export function getFallbackPageTemplateId(slug: string): PageTemplateId {
  const normalizedSlug = slug.toLowerCase().replace(/^\/+|\/+$/g, "");
  const parts = normalizedSlug.split("/");
  const leafSlug = parts[parts.length - 1] ?? normalizedSlug;

  if (leafSlug === "home" || leafSlug === "") {
    return "landing-blank";
  }

  if (
    leafSlug === "privacy" ||
    leafSlug === "privacy-policy" ||
    leafSlug === "terms" ||
    leafSlug === "terms-of-service"
  ) {
    return "policy";
  }

  return "default";
}

export function createFallbackPage(input: {
  slug: string;
  locale?: string;
  market?: string;
  title?: string;
  siteChrome?: PageChromeSettings;
}): PageSchema {
  const templateId = getFallbackPageTemplateId(input.slug);
  const title = input.title ?? getFallbackPageTitle(input.slug);
  const templateChrome = getPageTemplateChrome(templateId);

  return pageSchema.parse({
    ...exampleLandingPage,
    meta: {
      ...exampleLandingPage.meta,
      slug: input.slug,
      title,
      market: input.market ?? exampleLandingPage.meta.market,
      locale: input.locale ?? exampleLandingPage.meta.locale
    },
    template: {
      id: templateId
    },
    chrome: input.siteChrome
      ? {
          header: {
            enabled: templateChrome.header.enabled,
            variant: input.siteChrome.header.variant,
            content: input.siteChrome.header.content
          },
          footer: {
            enabled: templateChrome.footer.enabled,
            variant: input.siteChrome.footer.variant,
            content: input.siteChrome.footer.content
          }
        }
      : templateChrome,
    seo: {
      ...exampleLandingPage.seo,
      title
    }
  });
}

function getFallbackPageTitle(slug: string): string {
  const normalizedSlug = slug.toLowerCase().replace(/^\/+|\/+$/g, "");

  if (normalizedSlug === "privacy" || normalizedSlug.endsWith("/privacy")) {
    return "Privacy Policy";
  }

  if (normalizedSlug === "terms" || normalizedSlug.endsWith("/terms")) {
    return "Terms of Service";
  }

  if (normalizedSlug === "home" || normalizedSlug === "") {
    return "Home";
  }

  return slug
    .split("/")
    .filter(Boolean)
    .pop()
    ?.split("-")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ") || "Page";
}

export const pageSchema = z.object({
  version: z.literal("1.0"),
  meta: z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    market: marketCodeSchema.default("us"),
    locale: localeCodeSchema.default("en-US")
  }),
  layout: z.object({
    desktop: z.record(z.unknown()).default({}),
    mobile: z.record(z.unknown()).default({})
  }),
  template: pageTemplateSchema,
  chrome: pageChromeSchema,
  sections: z.array(sectionNodeSchema),
  seo: seoConfigSchema,
  analytics: analyticsConfigSchema.default({
    enabled: true,
    dataLayerName: "dataLayer"
  })
});
export type PageSchema = z.infer<typeof pageSchema>;

export const apiErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  COMMERCE_DISABLED: "COMMERCE_DISABLED",
  MULTI_LOCALE_DISABLED: "MULTI_LOCALE_DISABLED",
  LOCALE_NOT_SUPPORTED: "LOCALE_NOT_SUPPORTED",
  TRANSLATION_KEY_CONFLICT: "TRANSLATION_KEY_CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ApiErrorCode = (typeof apiErrorCodes)[keyof typeof apiErrorCodes];

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    tenantId?: string;
    siteId?: string;
    market?: string;
    locale?: string;
    fallbackLocale?: string;
    isFallback?: boolean;
  };
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export const defaultRuntimeConfig = {
  commerceEnabled: false,
  multiLocaleEnabled: false,
  defaultMarket: "us",
  defaultLocale: "en-US",
  defaultCurrency: "USD",
  fallbackLocale: "en-US"
} as const;

export const exampleLandingPage: PageSchema = pageSchema.parse({
  version: "1.0",
  meta: {
    slug: "home",
    title: "Home",
    market: "us",
    locale: "en-US"
  },
  layout: {
    desktop: {},
    mobile: {}
  },
  template: {
    id: "landing-blank"
  },
  chrome: getPageTemplateChrome("landing-blank"),
  sections: [
    {
      id: "hero",
      component: "hero-banner",
      props: {
        eyebrow: "MVP scaffold",
        title: { defaultValue: "High-fidelity storefront builder" },
        body: {
          defaultValue:
            "A schema-first foundation for pages, preview, publishing, localization, commerce reservations, and future theme extensibility."
        },
        ctaLabel: "Preview"
      },
      layout: {
        desktop: { x: 0, y: 0, width: 1200, height: 560 },
        mobile: { x: 0, y: 0, width: 390, height: 620 }
      }
    },
    {
      id: "copy",
      component: "rich-text",
      props: {
        title: { defaultValue: "Built for long-term ownership" },
        content: {
          defaultValue:
            "The MVP starts with controlled high-fidelity sections and keeps stable seams for secondary development."
        }
      },
      layout: {
        desktop: { x: 0, y: 560, width: 1200 },
        mobile: { x: 0, y: 620, width: 390 }
      }
    }
  ],
  seo: {
    title: "App Starter",
    description: "Independent storefront platform scaffold"
  }
});
