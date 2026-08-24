import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function uploadSmokeImage(target, image) {
  const response = await fetch(target.uploadUrl, {
    body: image.body,
    headers: target.headers,
    method: target.method,
    redirect: "manual",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(readUploadError(response, text));
  }
}

function readUploadError(response, text) {
  const message = text.slice(0, 160) || response.statusText || "Unknown error";
  const redirectLocation = readRedirectLocation(response);
  const redirect = redirectLocation ? ` redirect: ${redirectLocation}` : "";

  return redactSmokeSecrets(
    `R2 object upload failed. ${response.status}: ${message}${redirect}`,
  );
}

function readRedirectLocation(response) {
  if (response.status < 300 || response.status >= 400) {
    return null;
  }

  return response.headers.get("location")?.trim() ?? null;
}
