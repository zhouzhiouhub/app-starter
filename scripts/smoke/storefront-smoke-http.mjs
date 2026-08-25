import {
  isOversizedResponseBodyError,
  readBoundedResponseText,
} from "./bounded-response-text.mjs";
import {
  cancelResponseBody,
  readRedirectLocation,
} from "./http-response-summary.mjs";
import { readErrorMessage as readStorefrontSmokeErrorMessage } from "./smoke-error-message.mjs";
import { readSmokeStorefrontHost } from "./storefront-smoke-host.mjs";

const storefrontHostHeaderName = "x-storefront-host";

export async function fetchStorefrontText(url, input, init) {
  const response = await fetch(
    url,
    createStorefrontSmokeRequestInit(input, init),
  );
  const redirectLocation = readRedirectLocation(response);
  if (redirectLocation) {
    await cancelResponseBody(response);
  }
  const body = redirectLocation
    ? { text: "" }
    : await readStorefrontResponseBody(response, url);

  return {
    ...(body.bodyReadError ? { bodyReadError: body.bodyReadError } : {}),
    ...(redirectLocation ? { redirectLocation } : {}),
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: body.text,
    url,
  };
}

export function createStorefrontSmokeRequestInit(input, init = {}) {
  const host = readSmokeStorefrontHost(input);
  const smokeInit = {
    ...init,
    redirect: "manual",
  };

  if (!host) {
    return smokeInit;
  }

  return {
    ...smokeInit,
    headers: {
      ...readHeaderObject(init.headers),
      [storefrontHostHeaderName]: host,
    },
  };
}

export function delayStorefrontSmoke(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { readStorefrontSmokeErrorMessage };

function readHeaderObject(headers) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

async function readStorefrontResponseBody(response, url) {
  try {
    return {
      text: await readBoundedResponseText(response, {
        label: "storefront",
        url,
      }),
    };
  } catch (error) {
    if (!isOversizedResponseBodyError(error)) {
      throw error;
    }

    return {
      bodyReadError: readStorefrontSmokeErrorMessage(error),
      text: "",
    };
  }
}
