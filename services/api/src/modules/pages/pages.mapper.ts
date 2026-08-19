import {
  createFallbackPage,
  getFallbackPageTemplateId,
  pageSchema,
  pageSlugSchema,
  pageTemplateIdSchema,
  type PageSchema,
  type PageTemplateId,
} from "@app-starter/schema";
import { z } from "zod";

export { pageSlugSchema };

export const createPageInputSchema = z.object({
  slug: pageSlugSchema,
  title: z.string().min(1).max(255).optional(),
  type: z.enum(["landing", "policy", "system"]).optional(),
  templateId: pageTemplateIdSchema.optional(),
});
export type CreatePageInput = z.infer<typeof createPageInputSchema>;

export const rollbackPageInputSchema = z.object({
  versionId: z.string().min(1),
});
export type RollbackPageInput = z.infer<typeof rollbackPageInputSchema>;

export const listPagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function unwrapBodyData(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const record = body as Record<string, unknown>;
  const data = record.data ?? record;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Request body data must be an object.");
  }

  return data as Record<string, unknown>;
}

export function parsePageSchema(input: unknown, slug: string): PageSchema {
  const payload = unwrapBodyData(input);
  const candidateMeta =
    payload.meta &&
    typeof payload.meta === "object" &&
    !Array.isArray(payload.meta)
      ? (payload.meta as Record<string, unknown>)
      : {};

  return pageSchema.parse({
    ...payload,
    meta: {
      ...candidateMeta,
      slug,
    },
  });
}

export function resolvePageType(
  slug: string,
  templateId?: PageTemplateId,
): "landing" | "policy" | "system" {
  if (templateId === "system") {
    return "system";
  }

  if (templateId === "policy" || getFallbackPageTemplateId(slug) === "policy") {
    return "policy";
  }

  const leaf = slug.split("/").filter(Boolean).pop() ?? slug;
  if (leaf === "404") {
    return "system";
  }

  return "landing";
}

export function createInitialPageSchema(input: CreatePageInput): PageSchema {
  return createFallbackPage({
    slug: input.slug,
    templateId: input.templateId,
    title: input.title,
  });
}

export function nextVersionNumber(latestVersion: number | undefined): number {
  return (latestVersion ?? 0) + 1;
}

export function toPageSummary(page: {
  id: string;
  siteId: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  publishedVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: page.id,
    siteId: page.siteId,
    slug: page.slug,
    title: page.title,
    type: page.type,
    status: page.status,
    publishedVersionId: page.publishedVersionId,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}
