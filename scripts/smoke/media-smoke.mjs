export async function assertMediaUploadTarget(input, accessToken) {
  const response = await fetchJson(`${input.apiBaseUrl}/media/upload-url`, {
    body: JSON.stringify({
      filename: `smoke-${Date.now().toString(36)}.webp`,
      mimeType: "image/webp",
      size: 128,
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

  assertUploadTargetShape(response.body?.data);

  if (input.requireR2Upload && !isR2UploadUrl(response.body.data.uploadUrl)) {
    throw new Error("Media upload target is not a Cloudflare R2 presigned URL.");
  }

  console.log(
    input.requireR2Upload
      ? "Media R2 upload target passed."
      : "Media upload target passed.",
  );
}

export function isR2UploadUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.hostname.endsWith(".r2.cloudflarestorage.com") &&
      url.searchParams.get("X-Amz-Algorithm") === "AWS4-HMAC-SHA256" &&
      Boolean(url.searchParams.get("X-Amz-Signature"))
    );
  } catch {
    return false;
  }
}

function assertUploadTargetShape(target) {
  if (!target || typeof target !== "object") {
    throw new Error("Media upload target did not return a data object.");
  }

  assertString(target.uploadUrl, "uploadUrl");
  assertString(target.r2Key, "r2Key");
  assertString(target.expiresAt, "expiresAt");

  if (target.method !== "PUT") {
    throw new Error(`Media upload target method must be PUT, got ${target.method}.`);
  }

  if (target.type !== "image") {
    throw new Error(`Media upload target type must be image, got ${target.type}.`);
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

  if (target.headers?.["Content-Type"] !== "image/webp") {
    throw new Error("Media upload target did not preserve the content type.");
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
