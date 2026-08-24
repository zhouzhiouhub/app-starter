import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export const maxSmokeResponseBodyBytes = 1_000_000;

const oversizedResponseBodyCode = "SMOKE_RESPONSE_BODY_TOO_LARGE";

export async function readBoundedResponseText(
  response,
  { label, maxBytes = maxSmokeResponseBodyBytes, url },
) {
  assertResponseContentLength(response, { label, maxBytes, url });

  if (response.body?.getReader) {
    return readBoundedResponseStream(response.body, { label, maxBytes, url });
  }

  const text = await response.text();
  assertResponseTextSize(text, { label, maxBytes, url });

  return text;
}

export function isOversizedResponseBodyError(error) {
  return error?.code === oversizedResponseBodyCode;
}

function assertResponseContentLength(response, options) {
  const value = response.headers.get("content-length");

  if (!value) {
    return;
  }

  const byteLength = Number(value);

  if (Number.isFinite(byteLength)) {
    assertResponseBodySize(byteLength, options);
  }
}

async function readBoundedResponseStream(stream, options) {
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

      if (byteLength > options.maxBytes) {
        await reader.cancel();
        throw createOversizedResponseBodyError(options);
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

function assertResponseTextSize(text, options) {
  assertResponseBodySize(new TextEncoder().encode(text).byteLength, options);
}

function assertResponseBodySize(byteLength, options) {
  if (byteLength <= options.maxBytes) {
    return;
  }

  throw createOversizedResponseBodyError(options);
}

function createOversizedResponseBodyError({ label, maxBytes, url }) {
  const error = new Error(
    redactSmokeSecrets(
      `${url} returned a ${label} response body larger than ${maxBytes} bytes.`,
    ),
  );
  error.code = oversizedResponseBodyCode;

  return error;
}

function readChunkByteLength(value) {
  return typeof value?.byteLength === "number" ? value.byteLength : 0;
}
