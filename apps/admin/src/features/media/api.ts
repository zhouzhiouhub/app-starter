import { adminRequest } from "../auth/api";
import { readApiErrorMessage } from "../../lib/api-error";
import { createIdempotencyKey } from "../../lib/idempotency-key";
import type {
  MediaAsset,
  MediaListMeta,
  MediaUploadTarget,
  RegisterMediaInput,
  UploadMediaFileInput,
} from "./types";

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
  return confirmMediaAsset({
    altText: input.altText,
    filename: input.filename,
    mimeType: input.mimeType,
    r2Key: upload.r2Key,
    size: input.size,
    url: input.url,
  });
}

export async function uploadMediaFile(
  input: UploadMediaFileInput,
): Promise<MediaAsset> {
  const upload = await createMediaUploadUrl({
    filename: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
  });

  await putMediaFile(upload, input.file);

  return confirmMediaAsset({
    altText: input.altText,
    filename: input.file.name,
    mimeType: input.file.type,
    r2Key: upload.r2Key,
    size: input.file.size,
  });
}

export async function confirmMediaAsset(input: {
  altText?: string;
  filename: string;
  mimeType: string;
  r2Key: string;
  size: number;
  url?: string;
}): Promise<MediaAsset> {
  const result = await readAdminJson<{ data?: MediaAsset }>(
    "/media/confirm",
    {
      body: JSON.stringify({
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        r2Key: input.r2Key,
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

export async function createMediaUploadUrl(input: {
  filename: string;
  mimeType: string;
  size: number;
}): Promise<MediaUploadTarget> {
  const result = await readAdminJson<{ data?: MediaUploadTarget }>(
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

  if (!result.data?.r2Key || !result.data.uploadUrl) {
    throw new Error("Upload URL could not be prepared.");
  }

  return result.data;
}

async function putMediaFile(
  upload: MediaUploadTarget,
  file: File,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(upload.uploadUrl, {
      body: file,
      headers: upload.headers,
      method: upload.method,
    });
  } catch {
    throw new Error(
      "Upload target could not be reached. Configure R2 upload environment variables before direct uploads.",
    );
  }

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }
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
