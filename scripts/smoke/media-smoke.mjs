import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import {
  createMediaSmokeDetails,
  formatMediaListFilterDiagnostic,
  isCdnUrlForR2Key,
  isMediaListResponseContainingAsset,
  isMediaReference,
  isProductionCdnUrl,
  isR2UploadUrl,
  isR2UploadUrlForKey,
  readMediaListFilterDiagnostic,
} from "./media-smoke-diagnostics.mjs";

export {
  createMediaSmokeDetails,
  formatMediaListFilterDiagnostic,
  isCdnUrlForR2Key,
  isMediaListResponseContainingAsset,
  isMediaReference,
  isProductionCdnUrl,
  isR2UploadUrl,
  isR2UploadUrlForKey,
  readMediaListFilterDiagnostic,
} from "./media-smoke-diagnostics.mjs";

const smokeImage = {
  body: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgF/6YxS7wAAAABJRU5ErkJggg==",
    "base64",
  ),
  filename: `smoke-${Date.now().toString(36)}.png`,
  metadata: {
    alt: "Smoke test pixel",
    height: 1,
    width: 1,
  },
  mimeType: "image/png",
};

export async function assertMediaUploadTarget(input, accessToken) {
  const response = await fetchJson(`${input.apiBaseUrl}/media/upload-url`, {
    body: JSON.stringify({
      filename: smokeImage.filename,
      mimeType: smokeImage.mimeType,
      size: smokeImage.body.byteLength,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Media upload target failed."));
  }

  const target = response.body?.data;
  assertUploadTargetShape(target);

  if (input.requireR2Upload && !isR2UploadUrl(target.uploadUrl)) {
    throw new Error(
      "Media upload target is not a secure Cloudflare R2 presigned URL.",
    );
  }

  if (
    input.requireR2Upload &&
    !isR2UploadUrlForKey(target.uploadUrl, target.r2Key)
  ) {
    throw new Error(
      "Media upload target URL does not match the returned R2 key.",
    );
  }

  if (input.requireR2Upload) {
    await uploadSmokeImage(target);
  }

  const asset = await confirmSmokeImage(input, accessToken, target);
  assertMediaAssetShape(asset, target, input.requireR2Upload);
  await assertMediaListFilters(input, accessToken, asset);

  console.log(
    input.requireR2Upload
      ? "Media R2 upload, CDN confirmation, and list filters passed."
      : "Media upload target, confirm, and list filters passed.",
  );

  return createMediaSmokeDetails(target, asset, input.requireR2Upload);
}

function assertUploadTargetShape(target) {
  if (!target || typeof target !== "object") {
    throw new Error("Media upload target did not return a data object.");
  }

  assertString(target.uploadUrl, "uploadUrl");
  assertString(target.r2Key, "r2Key");
  assertString(target.expiresAt, "expiresAt");

  if (target.method !== "PUT") {
    throw new Error(
      `Media upload target method must be PUT, got ${target.method}.`,
    );
  }

  if (target.type !== "image") {
    throw new Error(
      `Media upload target type must be image, got ${target.type}.`,
    );
  }

  if (target.confirmPath !== "/api/v1/media/confirm") {
    throw new Error("Media upload target returned an unexpected confirmPath.");
  }

  if (!Number.isInteger(target.maxSize) || target.maxSize < 128) {
    throw new Error("Media upload target returned an invalid maxSize.");
  }

  if (Number.isNaN(Date.parse(target.expiresAt))) {
    throw new Error("Media upload target returned an invalid expiresAt.");
  }

  if (target.headers?.["Content-Type"] !== smokeImage.mimeType) {
    throw new Error("Media upload target did not preserve the content type.");
  }
}

async function uploadSmokeImage(target) {
  const response = await fetch(target.uploadUrl, {
    body: smokeImage.body,
    headers: target.headers,
    method: target.method,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `R2 object upload failed. ${response.status}: ${text.slice(0, 160)}`,
    );
  }
}

async function confirmSmokeImage(input, accessToken, target) {
  const response = await fetchJson(`${input.apiBaseUrl}/media/confirm`, {
    body: JSON.stringify({
      filename: smokeImage.filename,
      metadata: smokeImage.metadata,
      mimeType: smokeImage.mimeType,
      r2Key: target.r2Key,
      size: smokeImage.body.byteLength,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Media confirm failed."));
  }

  return response.body?.data;
}

async function assertMediaListFilters(input, accessToken, asset) {
  const query = new URLSearchParams({
    limit: "20",
    page: "1",
    status: "active",
    type: "image",
  });
  const response = await fetchJson(`${input.apiBaseUrl}/media?${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Media list filter check failed."));
  }

  if (!isMediaListResponseContainingAsset(response.body, asset)) {
    const diagnostic = readMediaListFilterDiagnostic(response.body, asset);

    throw new Error(
      `Media list filter check did not return the confirmed image asset (${formatMediaListFilterDiagnostic(
        diagnostic,
      )}).`,
    );
  }
}

function assertMediaAssetShape(asset, target, requireProductionCdn) {
  if (!asset || typeof asset !== "object") {
    throw new Error("Media confirm did not return a data object.");
  }

  assertString(asset.id, "id");
  assertString(asset.url, "url");
  assertString(asset.reference, "reference");

  if (asset.filename !== smokeImage.filename) {
    throw new Error("Media confirm did not preserve the filename.");
  }

  if (asset.mimeType !== smokeImage.mimeType || asset.type !== "image") {
    throw new Error("Media confirm returned an unexpected media type.");
  }

  if (asset.r2Key !== target.r2Key) {
    throw new Error("Media confirm returned an unexpected R2 key.");
  }

  if (asset.size !== smokeImage.body.byteLength) {
    throw new Error("Media confirm returned an unexpected file size.");
  }

  if (!isMediaReference(asset.reference)) {
    throw new Error("Media confirm returned an invalid media:// reference.");
  }

  if (!isCdnUrlForR2Key(asset.url, target.r2Key)) {
    throw new Error("Media confirm returned a CDN URL for the wrong object.");
  }

  if (requireProductionCdn && !isProductionCdnUrl(asset.url)) {
    throw new Error(
      "Media confirm used the local CDN fallback; set MEDIA_CDN_BASE_URL.",
    );
  }
}

function assertString(value, field) {
  if (typeof value !== "string" || !value) {
    throw new Error(`Media upload target returned an invalid ${field}.`);
  }
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? parseJson(text, url) : null;

  return {
    body,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url,
  };
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON content: ${text.slice(0, 160)}`);
  }
}

function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return `${fallback} ${response.status}: ${message}`;
}
