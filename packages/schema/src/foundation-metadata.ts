import { z } from "zod";
import {
  seoImageUrlSchema,
  seoUrlSchema,
} from "./foundation-url.js";

export const seoConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  ogImage: seoImageUrlSchema.optional(),
  canonical: seoUrlSchema.optional(),
  noIndex: z.boolean().default(false),
});
export type SeoConfig = z.infer<typeof seoConfigSchema>;

export const analyticsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dataLayerName: z.string().default("dataLayer"),
});
export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;
