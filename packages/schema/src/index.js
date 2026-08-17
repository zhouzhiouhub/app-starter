import { z } from "zod";
export const viewportSchema = z.enum(["desktop", "mobile"]);
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
export const layoutBoxSchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().positive(),
    height: z.number().positive().optional(),
    padding: z.string().optional(),
    gap: z.string().optional()
});
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
export const seoConfigSchema = z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    ogImage: z.string().optional(),
    canonical: z.string().optional()
});
export const analyticsConfigSchema = z.object({
    enabled: z.boolean().default(true),
    dataLayerName: z.string().default("dataLayer")
});
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
    sections: z.array(sectionNodeSchema),
    seo: seoConfigSchema,
    analytics: analyticsConfigSchema.default({
        enabled: true,
        dataLayerName: "dataLayer"
    })
});
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
};
export const defaultRuntimeConfig = {
    commerceEnabled: false,
    multiLocaleEnabled: false,
    defaultMarket: "us",
    defaultLocale: "en-US",
    defaultCurrency: "USD",
    fallbackLocale: "en-US"
};
export const exampleLandingPage = pageSchema.parse({
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
    sections: [
        {
            id: "hero",
            component: "hero-banner",
            props: {
                eyebrow: "MVP scaffold",
                title: { defaultValue: "High-fidelity storefront builder" },
                body: {
                    defaultValue: "A schema-first foundation for pages, preview, publishing, localization, commerce reservations, and future theme extensibility."
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
                    defaultValue: "The MVP starts with controlled high-fidelity sections and keeps stable seams for secondary development."
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
