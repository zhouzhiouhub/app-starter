import { z } from "zod";
import {
  analyticsConfigSchema,
  localeCodeSchema,
  marketCodeSchema,
  pageSlugSchema,
  sectionNodeSchema,
  seoConfigSchema,
} from "./foundation.js";
import { pageChromeSchema } from "./page-chrome.js";
import { pageTemplateSchema } from "./page-template.js";

export const pageViewportLayoutSchema = z
  .object({
    sectionOrder: z.array(z.string().min(1)).optional(),
  })
  .catchall(z.unknown())
  .default({});
export type PageViewportLayout = z.infer<typeof pageViewportLayoutSchema>;

export const pageLayoutSchema = z.object({
  desktop: pageViewportLayoutSchema,
  mobile: pageViewportLayoutSchema,
});
export type PageLayout = z.infer<typeof pageLayoutSchema>;

export const pageSchema = z.object({
  version: z.literal("1.0"),
  meta: z.object({
    slug: pageSlugSchema,
    title: z.string().min(1),
    market: marketCodeSchema.default("us"),
    locale: localeCodeSchema.default("en-US"),
  }),
  layout: pageLayoutSchema,
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
