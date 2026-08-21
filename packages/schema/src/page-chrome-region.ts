import { z } from "zod";
import { chromeVariantSchema } from "./page-chrome-navigation.js";

export const pageChromeRegionBaseObjectSchema = z.object({
  enabled: z.boolean().default(true),
  variant: chromeVariantSchema.default("default"),
});

export const pageChromeRegionBaseSchema =
  pageChromeRegionBaseObjectSchema.default({
    enabled: true,
    variant: "default",
  });
