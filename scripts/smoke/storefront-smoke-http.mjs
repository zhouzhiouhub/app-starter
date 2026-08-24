import { redactSmokeSecrets } from "./smoke-secrets.mjs";
import { readSmokeStorefrontHost } from "./storefront-smoke-host.mjs";

const storefrontHostHeaderName = "x-storefront-host";
const maxStorefrontResponseBodyBytes = 1_000_000;

export async function fetchStorefrontText(url, input, init) {
  const response = await fetch(
    url,
    createStorefrontSmokeRequestInit(input, init),
  );
  const redirectLocation = readRedirectLocation(response);
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

export function readStorefrontSmokeErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}

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
      text: await readBoundedStorefrontResponseText(response, url),
    };
  } catch (error) {
    if (!isOversizedStorefrontResponseError(error)) {
      throw error;
    }

    return {
      bodyReadError: readStorefrontSmokeErrorMessage(error),
      text: "",
    };
  }
}

async function readBoundedStorefrontResponseText(response, url) {
  assertStorefrontContentLength(response, url);

  if (response.body?.getReader) {
    return readBoundedStorefrontResponseStream(response.body, url);
  }

  const text = await response.text();
  assertStorefrontTextSize(text, url);

  return text;
}

async function readBoundedStorefrontResponseStream(stream, url) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const chunks = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      byteLength += readChunkByteLength(value);

      if (byteLength > maxStorefrontResponseBodyBytes) {
        await reader.cancel();
        throw createOversizedStorefrontResponseError(url);
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }

    const tail = decoder.decode();

    if (tail) {
      chunks.push(tail);
    }
  } finally {
    reader.releaseLock?.();
  }

  return chunks.join("");
}

function assertStorefrontContentLength(response, url) {
  const value = response.headers.get("content-length");

  if (!value) {
    return;
  }

  const byteLength = Number(value);

  if (Number.isFinite(byteLength)) {
    assertStorefrontBodySize(byteLength, url);
  }
}

function assertStorefrontTextSize(text, url) {
  assertStorefrontBodySize(new TextEncoder().encode(text).byteLength, url);
}

function assertStorefrontBodySize(byteLength, url) {
  if (byteLength <= maxStorefrontResponseBodyBytes) {
    return;
  }

  throw createOversizedStorefrontResponseError(url);
}

function createOversizedStorefrontResponseError(url) {
  const error = new Error(
    redactSmokeSecrets(
      `${url} returned a storefront response body larger than ${maxStorefrontResponseBodyBytes} bytes.`,
    ),
  );
  error.code = "SMOKE_STOREFRONT_RESPONSE_BODY_TOO_LARGE";
  return error;
}

function readChunkByteLength(value) {
  return typeof value?.byteLength === "number" ? value.byteLength : 0;
}

function isOversizedStorefrontResponseError(error) {
  return error?.code === "SMOKE_STOREFRONT_RESPONSE_BODY_TOO_LARGE";
}

function readRedirectLocation(response) {
  if (response.status < 300 || response.status >= 400) {
    return null;
  }

  const location = response.headers.get("location")?.trim();

  return location ? redactSmokeSecrets(location) : null;
}
