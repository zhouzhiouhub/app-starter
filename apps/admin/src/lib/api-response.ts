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
    return readOversizedApiResponse();
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  if (text.length > maxApiResponseBodyLength) {
    return readOversizedApiResponse();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: readPlainTextResponseMessage(text, response.status) };
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
