import {
  fetchJson,
  readHttpError,
} from "./http-json-smoke.mjs";
import {
  isOversizedResponseBodyError,
  readBoundedResponseText,
} from "./bounded-response-text.mjs";
import {
  cancelResponseBody,
  readRedirectLocation,
} from "./http-response-summary.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export { fetchJson, readErrorMessage, readHttpError, redactSmokeSecrets };

export async function fetchText(url, init) {
  const response = await fetch(url, {
    ...init,
    redirect: init?.redirect ?? "manual",
  });
  const redirectLocation = readRedirectLocation(response);
  if (redirectLocation) {
    await cancelResponseBody(response);
  }
  const body = redirectLocation
    ? { text: "" }
    : await readPreviewResponseBody(response, url);

  return {
    ...(body.bodyReadError ? { bodyReadError: body.bodyReadError } : {}),
    ok: response.ok,
    ...(redirectLocation ? { redirectLocation } : {}),
    status: response.status,
    statusText: response.statusText,
    text: body.text,
    url,
  };
}

async function readPreviewResponseBody(response, url) {
  try {
    return {
      text: await readBoundedResponseText(response, {
        label: "preview",
        url,
      }),
    };
  } catch (error) {
    if (!isOversizedResponseBodyError(error)) {
      throw error;
    }

    return {
      bodyReadError: readErrorMessage(error),
      text: "",
    };
  }
}
