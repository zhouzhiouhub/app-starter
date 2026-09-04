import { z } from "zod";
import {
  i18nTextSchema,
  safeHrefSchema,
  seoImageUrlSchema,
} from "./foundation.js";

export const defaultStorefrontBrandLogoSrc = "/brand/kinolin-logo.svg";

export function createDefaultChromeBrand() {
  return {
    href: "/",
    label: { defaultValue: "kinolin" },
    logoSrc: defaultStorefrontBrandLogoSrc,
  };
}

export const chromeBrandSchema = z
  .object({
    href: safeHrefSchema.default("/"),
    label: i18nTextSchema,
    logoSrc: seoImageUrlSchema
      .optional()
      .default(defaultStorefrontBrandLogoSrc),
  })
  .default(() => createDefaultChromeBrand());
export type ChromeBrand = z.infer<typeof chromeBrandSchema>;
