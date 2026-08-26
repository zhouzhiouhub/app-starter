import {
  isOversizedResponseBodyError,
  readBoundedResponseText,
} from "./bounded-response-text.mjs";
import {
  cancelResponseBody,
  readRedirectLocation,
} from "./http-response-summary.mjs";
import { readErrorMessage as readUploadErrorMessage } from "./smoke-error-message.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

const maxUploadErrorMessageLength = 520;
const maxUploadErrorBodySnippetLength = 160;

export async function uploadSmokeImage(target, image) {
  const response = await fetch(target.uploadUrl, {
    body: image.body,
    headers: target.headers,
    method: target.method,
    redirect: "manual",
  });

  if (!response.ok) {
    const redirectLocation = readRedirectLocation(response);
    if (redirectLocation) {
      await cancelResponseBody(response);
    }
    const failureBody = redirectLocation
      ? { text: "" }
      : await readUploadFailureBody(response, target.uploadUrl);
    throw new Error(readUploadError(response, failureBody, redirectLocation));
  }
}

function readUploadError(response, failureBody, redirectLocation) {
  const text = failureBody.text ?? "";
  const message =
    formatSmokeText(text, { maxLength: maxUploadErrorBodySnippetLength }) ||
    response.statusText ||
    "Unknown error";
  const bodyReadError = failureBody.bodyReadError
    ? ` body read error: ${failureBody.bodyReadError}`
    : "";
  const redirect = redirectLocation ? ` redirect: ${redirectLocation}` : "";

  return formatSmokeText(
    `R2 object upload failed. ${response.status}: ${message}${bodyReadError}${redirect}`,
    {
      fallback: "R2 object upload failed.",
      maxLength: maxUploadErrorMessageLength,
    },
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
