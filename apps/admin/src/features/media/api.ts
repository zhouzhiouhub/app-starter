import { adminRequest } from "../auth/api";
import { readApiErrorMessage } from "../../lib/api-error";
import { createIdempotencyKey } from "../../lib/idempotency-key";
import type { MediaAsset, MediaListMeta, RegisterMediaInput } from "./types";

export async function listMediaAssets(
  page = 1,
  limit = 20,
): Promise<{ data: MediaAsset[]; meta: MediaListMeta }> {
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  const result = await readAdminJson<{
    data?: MediaAsset[];
    meta?: Partial<MediaListMeta>;
  }>(`/media?${query.toString()}`, {}, "Media assets could not be loaded.");

  return {
    data: result.data ?? [],
    meta: {
      limit: result.meta?.limit ?? limit,
      page: result.meta?.page ?? page,
      total: result.meta?.total ?? result.data?.length ?? 0,
    },
  };
}

export async function registerMediaAsset(
  input: RegisterMediaInput,
): Promise<MediaAsset> {
  const upload = await createMediaUploadUrl(input);
  const result = await readAdminJson<{ data?: MediaAsset }>(
    "/media/confirm",
    {
      body: JSON.stringify({
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        r2Key: upload.r2Key,
        url: input.url,
        metadata: {
          ...(input.altText ? { altText: input.altText } : {}),
        },
      }),
      headers: jsonHeaders(),
      method: "POST",
    },
    "Media asset could not be registered.",
  );

  if (!result.data?.id) {
    throw new Error("Media asset could not be registered.");
  }

  return result.data;
}

async function createMediaUploadUrl(input: RegisterMediaInput): Promise<{
  r2Key: string;
}> {
  const result = await readAdminJson<{ data?: { r2Key?: string } }>(
    "/media/upload-url",
    {
      body: JSON.stringify({
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    "Upload URL could not be prepared.",
  );

  if (!result.data?.r2Key) {
    throw new Error("Upload URL could not be prepared.");
  }

  return { r2Key: result.data.r2Key };
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
