import { randomUUID } from "node:crypto";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  isCdnUrlForR2Key,
  isMediaReference,
  isProductionCdnUrl,
} from "./media-smoke-diagnostics.mjs";

export async function confirmSmokeImage(input, accessToken, target, image) {
  const response = await fetchJson(`${input.apiBaseUrl}/media/confirm`, {
    body: JSON.stringify({
      filename: image.filename,
      metadata: image.metadata,
      mimeType: image.mimeType,
      r2Key: target.r2Key,
      size: image.body.byteLength,
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

export function assertMediaAssetShape(
  asset,
  target,
  image,
  requireProductionCdn,
) {
  if (!asset || typeof asset !== "object") {
    throw new Error("Media confirm did not return a data object.");
  }

  assertString(asset.id, "id");
  assertString(asset.url, "url");
  assertString(asset.reference, "reference");

  if (asset.filename !== image.filename) {
    throw new Error("Media confirm did not preserve the filename.");
  }

  if (asset.mimeType !== image.mimeType || asset.type !== "image") {
    throw new Error("Media confirm returned an unexpected media type.");
  }

  if (asset.r2Key !== target.r2Key) {
    throw new Error("Media confirm returned an unexpected R2 key.");
  }

  if (asset.size !== image.body.byteLength) {
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
      "Media confirm did not return a production CDN URL; set MEDIA_CDN_BASE_URL to a real HTTPS CDN host.",
    );
  }
}

function assertString(value, field) {
  if (typeof value !== "string" || !value) {
    throw new Error(`Media confirm returned an invalid ${field}.`);
  }
}
