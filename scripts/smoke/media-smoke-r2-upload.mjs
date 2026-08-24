import {
  isOversizedResponseBodyError,
  readBoundedResponseText,
} from "./bounded-response-text.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function uploadSmokeImage(target, image) {
  const response = await fetch(target.uploadUrl, {
    body: image.body,
    headers: target.headers,
    method: target.method,
    redirect: "manual",
  });

  if (!response.ok) {
    const redirectLocation = readRedirectLocation(response);
    const failureBody = redirectLocation
      ? { text: "" }
      : await readUploadFailureBody(response, target.uploadUrl);
    throw new Error(readUploadError(response, failureBody, redirectLocation));
  }
}

function readUploadError(response, failureBody, redirectLocation) {
  const text = failureBody.text ?? "";
  const message = text.slice(0, 160) || response.statusText || "Unknown error";
  const bodyReadError = failureBody.bodyReadError
    ? ` body read error: ${failureBody.bodyReadError}`
    : "";
  const redirect = redirectLocation ? ` redirect: ${redirectLocation}` : "";

  return redactSmokeSecrets(
    `R2 object upload failed. ${response.status}: ${message}${bodyReadError}${redirect}`,
  );
}

async function readUploadFailureBody(response, url) {
  try {
    return {
      text: await readBoundedResponseText(response, {
        label: "R2 object upload",
        url,
      }),
    };
  } catch (error) {
    if (!isOversizedResponseBodyError(error)) {
      throw error;
    }

    return {
      bodyReadError: readUploadErrorMessage(error),
      text: "",
    };
  }
}

function readUploadErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}

function readRedirectLocation(response) {
  if (response.status < 300 || response.status >= 400) {
    return null;
  }

  return response.headers.get("location")?.trim() ?? null;
}
