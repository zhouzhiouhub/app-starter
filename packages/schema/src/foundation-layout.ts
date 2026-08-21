import { z } from "zod";

export const layoutBoxSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive().optional(),
  padding: z.string().optional(),
  gap: z.string().optional(),
});
export type LayoutBox = z.infer<typeof layoutBoxSchema>;

export const sectionNodeSchema = z.object({
  id: z.string().min(1),
  component: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  layout: z.object({
    desktop: layoutBoxSchema.optional(),
    mobile: layoutBoxSchema.optional(),
  }),
  visibility: z
    .object({
      desktop: z.boolean().default(true),
      mobile: z.boolean().default(true),
    })
    .default({ desktop: true, mobile: true }),
  analytics: z.record(z.unknown()).optional(),
});
export type SectionNode = z.infer<typeof sectionNodeSchema>;
