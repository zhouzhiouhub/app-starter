import { pageSchema, type PageSchema } from "@app-starter/schema";
import { adminRequest } from "../auth/api";
import { readApiErrorMessage } from "../../lib/api-error";
import { createIdempotencyKey } from "../../lib/idempotency-key";
import type {
  CreatePageInput,
  PageDetail,
  PageListMeta,
  PageMutationResult,
  PagePreviewToken,
  PageSummary,
} from "./types";

export async function listPages(
  page = 1,
  limit = 20,
): Promise<{ data: PageSummary[]; meta: PageListMeta }> {
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  const result = await readAdminJson<{
    data?: PageSummary[];
    meta?: Partial<PageListMeta>;
  }>(`/pages?${query.toString()}`, {}, "Page list could not be loaded.");

  return {
    data: result.data ?? [],
    meta: {
      limit: result.meta?.limit ?? limit,
      page: result.meta?.page ?? page,
      total: result.meta?.total ?? result.data?.length ?? 0,
    },
  };
}

export async function createPage(input: CreatePageInput): Promise<PageSummary> {
  const result = await readAdminJson<{ data?: PageSummary }>(
    "/pages",
    {
      body: JSON.stringify(input),
      headers: jsonHeaders(),
      method: "POST",
    },
    "Page could not be created.",
  );

  if (!result.data?.id) {
    throw new Error("Page could not be created.");
  }

  return result.data;
}

export async function getPage(pageId: string): Promise<PageDetail> {
  const result = await readAdminJson<{ data?: PageDetail }>(
    `/pages/${encodeURIComponent(pageId)}`,
    {},
    "Page could not be loaded.",
  );

  if (!result.data?.id) {
    throw new Error("Page could not be loaded.");
  }

  return result.data;
}

export async function createPreviewToken(
  pageId: string,
): Promise<PagePreviewToken> {
  const result = await readAdminJson<{ data?: PagePreviewToken }>(
    `/pages/${encodeURIComponent(pageId)}/preview-token`,
    {
      method: "POST",
    },
    "Preview token could not be created.",
  );

  if (!result.data?.token) {
    throw new Error("Preview token could not be created.");
  }

  return result.data;
}

export async function savePageDraft(
  pageId: string,
  schema: PageSchema,
): Promise<PageSummary> {
  const parsed = requireValidSchema(schema);
  const result = await readAdminJson<{ data?: PageSummary }>(
    `/pages/${encodeURIComponent(pageId)}/schema`,
    {
      body: JSON.stringify(parsed),
      headers: jsonHeaders(),
      method: "PUT",
    },
    "Draft could not be saved.",
  );

  if (!result.data?.id) {
    throw new Error("Draft could not be saved.");
  }

  return result.data;
}

export async function publishPage(
  pageId: string,
  schema: PageSchema,
): Promise<PageMutationResult> {
  const parsed = requireValidSchema(schema);
  const result = await readAdminJson<{
    data?: unknown;
    meta?: PageMutationResult["meta"];
  }>(
    `/pages/${encodeURIComponent(pageId)}/publish`,
    {
      body: JSON.stringify(parsed),
      headers: jsonHeaders(),
      method: "POST",
    },
    "Publish request failed.",
  );

  return {
    meta: result.meta ?? null,
    schema: pageSchema.parse(result.data),
  };
}

export async function rollbackPage(
  pageId: string,
  versionId: string,
): Promise<PageMutationResult> {
  const result = await readAdminJson<{
    data?: unknown;
    meta?: PageMutationResult["meta"];
  }>(
    `/pages/${encodeURIComponent(pageId)}/rollback`,
    {
      body: JSON.stringify({ versionId }),
      headers: jsonHeaders(),
      method: "POST",
    },
    "Rollback request failed.",
  );

  return {
    meta: result.meta ?? null,
    schema: pageSchema.parse(result.data),
  };
}

function requireValidSchema(schema: PageSchema): PageSchema {
  const parsed = pageSchema.safeParse(schema);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Page schema is invalid and cannot be saved.",
    );
  }

  return parsed.data;
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Idempotency-Key": createIdempotencyKey(),
  };
}

async function readAdminJson<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await adminRequest(path, init);
  const result = (await response.json()) as T & { error?: unknown };

  if (!response.ok) {
    throw new Error(readApiErrorMessage(result, fallback));
  }

  return result;
}
