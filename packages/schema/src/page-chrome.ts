import { z } from "zod";
import {
  pageFooterChromeSchema,
  type PageFooterChromeSettings,
} from "./page-chrome-footer.js";
import {
  pageHeaderChromeSchema,
  type PageHeaderChromeSettings,
} from "./page-chrome-header.js";

export * from "./page-chrome-brand.js";
export * from "./page-chrome-defaults.js";
export * from "./page-chrome-footer.js";
export * from "./page-chrome-header.js";
export * from "./page-chrome-navigation.js";
export * from "./page-chrome-region.js";

export type PageChromeRegion =
  PageHeaderChromeSettings | PageFooterChromeSettings;

export const pageChromeSchema = z
  .object({
    header: pageHeaderChromeSchema,
    footer: pageFooterChromeSchema,
  })
  .default(() => ({
    header: pageHeaderChromeSchema.parse({}),
    footer: pageFooterChromeSchema.parse({}),
  }));
export type PageChromeSettings = z.infer<typeof pageChromeSchema>;
