import {
  pageSchema,
  pageSlugSchema,
  type PageSchema,
} from "@app-starter/schema";
import { adminRequest } from "../auth/api.ts";
import { readApiResponseJson } from "../../lib/api-response.ts";
import { createIdempotencyKey } from "../../lib/idempotency-key.ts";
import type {
  CreatePageInput,
  PageDetail,
  PageListMeta,
  PageMutationResult,
  PagePreviewToken,
  PageSummary,
} from "./types.ts";

const maxPreviewTokenLength = 2048;
const previewTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

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
  const result = await readAdminJson<{ data?: unknown }>(
    `/pages/${encodeURIComponent(pageId)}/preview-token`,
    {
      headers: idempotencyHeaders(),
      method: "POST",
    },
    "Preview token could not be created.",
  );

  return readPreviewTokenResponse(result.data);
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

function readPreviewTokenResponse(value: unknown): PagePreviewToken {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Preview token could not be created.");
  }

  const record = value as Record<string, unknown>;
  const slug = pageSlugSchema.safeParse(record.slug);

  if (
    !isPreviewTokenCandidate(record.token) ||
    !isValidTimestamp(record.expiresAt) ||
    !slug.success
  ) {
    throw new Error("Preview token could not be created.");
  }

  return {
    expiresAt: record.expiresAt,
    slug: slug.data,
    token: record.token,
  };
}

function isPreviewTokenCandidate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxPreviewTokenLength &&
    value.trim() === value &&
    previewTokenPattern.test(value)
  );
}

function isValidTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    Number.isFinite(Date.parse(value))
  );
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...idempotencyHeaders(),
  };
}

function idempotencyHeaders(): HeadersInit {
  return {
    "Idempotency-Key": createIdempotencyKey(),
  };
}

async function readAdminJson<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await adminRequest(path, init);
  return readApiResponseJson<T>(response, fallback);
}
