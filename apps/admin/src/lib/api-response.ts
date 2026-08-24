import { createApiRequestError } from "./api-error.ts";
import { redactApiMessageSecrets } from "./api-message-redaction.ts";

const maxApiResponseBodyLength = 1_000_000;
const oversizedApiResponseCode = "RESPONSE_BODY_TOO_LARGE";
const oversizedApiResponseMessage =
  "API response body is too large to process.";

export async function readApiResponseJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const result = await readResponseBody(response);

  if (!response.ok || isOversizedApiResponse(result)) {
    throw createApiRequestError(result, fallback);
  }

  return (result ?? {}) as T;
}

export async function readResponseBody(response: Response): Promise<unknown> {
  if (hasOversizedContentLength(response)) {
    await cancelApiResponseBody(response);
    return readOversizedApiResponse();
  }

  const body = await readBoundedResponseText(response);

  if (body.oversized) {
    return readOversizedApiResponse();
  }

  const text = body.text;

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: readPlainTextResponseMessage(text, response.status) };
  }
}

async function cancelApiResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    return;
  }
}

function readPlainTextResponseMessage(text: string, status: number): string {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (!normalized || normalized.startsWith("<")) {
    return `Request failed (${status}).`;
  }

  return redactApiMessageSecrets(normalized).slice(0, 200);
}

function hasOversizedContentLength(response: Response): boolean {
  const value = response.headers.get("content-length");

  if (!value) {
    return false;
  }

  const length = Number(value);

  return Number.isFinite(length) && length > maxApiResponseBodyLength;
}

async function readBoundedResponseText(
  response: Response,
): Promise<{ oversized: false; text: string } | { oversized: true }> {
  if (response.body?.getReader) {
    return readBoundedResponseStream(response.body);
  }

  const text = await response.text();

  return hasOversizedText(text)
    ? { oversized: true }
    : { oversized: false, text };
}

async function readBoundedResponseStream(
  stream: ReadableStream<Uint8Array>,
): Promise<{ oversized: false; text: string } | { oversized: true }> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const chunks: string[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      byteLength += value.byteLength;

      if (byteLength > maxApiResponseBodyLength) {
        await reader.cancel();
        return { oversized: true };
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }

    const tail = decoder.decode();

    if (tail) {
      chunks.push(tail);
    }
  } finally {
    reader.releaseLock();
  }

  return { oversized: false, text: chunks.join("") };
}

function hasOversizedText(text: string): boolean {
  return new TextEncoder().encode(text).byteLength > maxApiResponseBodyLength;
}

function readOversizedApiResponse(): {
  error: { code: string; message: string };
} {
  return {
    error: {
      code: oversizedApiResponseCode,
      message: oversizedApiResponseMessage,
    },
  };
}

function isOversizedApiResponse(result: unknown): boolean {
  if (!result || typeof result !== "object") {
    return false;
  }

  const record = result as { error?: { code?: unknown } };

  return record.error?.code === oversizedApiResponseCode;
}
