import { z } from "zod";
import {
  pageChromeSchema,
  type PageChromeSettings,
} from "./page-chrome.js";

export const pageTemplateIdSchema = z.enum([
  "default",
  "landing-blank",
  "policy",
]);
export type PageTemplateId = z.infer<typeof pageTemplateIdSchema>;

export const pageTemplateSchema = z
  .object({
    id: pageTemplateIdSchema.default("default"),
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
      footer: { enabled: true, variant: "default" },
    }),
  },
  "landing-blank": {
    id: "landing-blank",
    label: "Landing blank",
    description: "Campaign page without global header or footer.",
    chrome: pageChromeSchema.parse({
      header: { enabled: false, variant: "minimal" },
      footer: { enabled: false, variant: "minimal" },
    }),
  },
  policy: {
    id: "policy",
    label: "Policy",
    description: "Policy page with the standard header and footer.",
    chrome: pageChromeSchema.parse({
      header: { enabled: true, variant: "default" },
      footer: { enabled: true, variant: "default" },
    }),
  },
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
  templateId: PageTemplateId,
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
