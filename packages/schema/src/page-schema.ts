import { z } from "zod";
import { createInitialPageSections } from "./create-initial-sections.js";
import {
  analyticsConfigSchema,
  localeCodeSchema,
  marketCodeSchema,
  pageSlugSchema,
  sectionNodeSchema,
  seoConfigSchema,
} from "./foundation.js";
import {
  pageChromeSchema,
  type PageChromeSettings,
} from "./page-chrome.js";
import {
  getFallbackPageTemplateId,
  getPageTemplateChrome,
  pageTemplateSchema,
  type PageTemplateId,
} from "./page-template.js";

export const pageSchema = z.object({
  version: z.literal("1.0"),
  meta: z.object({
    slug: pageSlugSchema,
    title: z.string().min(1),
    market: marketCodeSchema.default("us"),
    locale: localeCodeSchema.default("en-US"),
  }),
  layout: z.object({
    desktop: z.record(z.unknown()).default({}),
    mobile: z.record(z.unknown()).default({}),
  }),
  template: pageTemplateSchema,
  chrome: pageChromeSchema,
  sections: z.array(sectionNodeSchema),
  seo: seoConfigSchema,
  analytics: analyticsConfigSchema.default({
    enabled: true,
    dataLayerName: "dataLayer",
  }),
});
export type PageSchema = z.infer<typeof pageSchema>;

export const exampleLandingPage: PageSchema = pageSchema.parse({
  version: "1.0",
  meta: {
    slug: "home",
    title: "Home",
    market: "us",
    locale: "en-US",
  },
  layout: {
    desktop: {},
    mobile: {},
  },
  template: {
    id: "landing-blank",
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
            "A schema-first foundation for pages, preview, publishing, localization, commerce reservations, and future theme extensibility.",
        },
        ctaLabel: "Preview",
      },
      layout: {
        desktop: { x: 0, y: 0, width: 1200, height: 560 },
        mobile: { x: 0, y: 0, width: 390, height: 620 },
      },
    },
    {
      id: "copy",
      component: "rich-text",
      props: {
        title: { defaultValue: "Built for long-term ownership" },
        content: {
          defaultValue:
            "The MVP starts with controlled high-fidelity sections and keeps stable seams for secondary development.",
        },
      },
      layout: {
        desktop: { x: 0, y: 560, width: 1200 },
        mobile: { x: 0, y: 620, width: 390 },
      },
    },
  ],
  seo: {
    title: "App Starter",
    description: "Independent storefront platform scaffold",
  },
});

export function createFallbackPage(input: {
  slug: string;
  locale?: string;
  market?: string;
  title?: string;
  templateId?: PageTemplateId;
  siteChrome?: PageChromeSettings;
}): PageSchema {
  const templateId = input.templateId ?? getFallbackPageTemplateId(input.slug);
  const title = input.title ?? getFallbackPageTitle(input.slug);
  const templateChrome = getPageTemplateChrome(templateId);

  return pageSchema.parse({
    ...exampleLandingPage,
    meta: {
      ...exampleLandingPage.meta,
      slug: input.slug,
      title,
      market: input.market ?? exampleLandingPage.meta.market,
      locale: input.locale ?? exampleLandingPage.meta.locale,
    },
    template: {
      id: templateId,
    },
    chrome: input.siteChrome
      ? {
          header: {
            enabled: templateChrome.header.enabled,
            variant: input.siteChrome.header.variant,
            content: input.siteChrome.header.content,
          },
          footer: {
            enabled: templateChrome.footer.enabled,
            variant: input.siteChrome.footer.variant,
            content: input.siteChrome.footer.content,
          },
        }
      : templateChrome,
    sections: createInitialPageSections({
      homeSections: exampleLandingPage.sections,
      slug: input.slug,
      templateId,
      title,
    }),
    seo: {
      ...exampleLandingPage.seo,
      title,
    },
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

  if (normalizedSlug === "404" || normalizedSlug.endsWith("/404")) {
    return "Page not found";
  }

  if (normalizedSlug === "home" || normalizedSlug === "") {
    return "Home";
  }

  return (
    slug
      .split("/")
      .filter(Boolean)
      .pop()
      ?.split("-")
      .filter(Boolean)
      .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
      .join(" ") || "Page"
  );
}
