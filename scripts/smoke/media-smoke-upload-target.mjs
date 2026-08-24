import { randomUUID } from "node:crypto";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  createMediaUploadTargetSmokeDetails,
  isR2UploadUrl,
  isR2UploadUrlForKey,
} from "./media-smoke-diagnostics.mjs";

export async function requestMediaUploadTarget(input, accessToken, image) {
  const response = await fetchJson(`${input.apiBaseUrl}/media/upload-url`, {
    body: JSON.stringify({
      filename: image.filename,
      mimeType: image.mimeType,
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
    throw new Error(readHttpError(response, "Media upload target failed."));
  }

  const target = response.body?.data;
  assertUploadTargetShape(target, image);

  if (input.requireR2Upload && !isR2UploadUrl(target.uploadUrl)) {
    throw createMediaUploadTargetError(
      "Media upload target is not a secure Cloudflare R2 presigned URL.",
      target,
    );
  }

  if (
    input.requireR2Upload &&
    !isR2UploadUrlForKey(target.uploadUrl, target.r2Key)
  ) {
    throw createMediaUploadTargetError(
      "Media upload target URL does not match the returned R2 key.",
      target,
    );
  }

  return target;
}

function createMediaUploadTargetError(message, target) {
  const error = new Error(message);
  error.smokeDetails = {
    mediaUploadTarget: createMediaUploadTargetSmokeDetails(target),
  };
  return error;
}

function assertUploadTargetShape(target, image) {
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

  if (target.headers?.["Content-Type"] !== image.mimeType) {
    throw new Error("Media upload target did not preserve the content type.");
  }
}

function assertString(value, field) {
  if (typeof value !== "string" || !value) {
    throw new Error(`Media upload target returned an invalid ${field}.`);
  }
}
