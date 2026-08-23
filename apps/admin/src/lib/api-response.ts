import { createApiRequestError } from "./api-error.ts";
import { redactApiMessageSecrets } from "./api-message-redaction.ts";

export async function readApiResponseJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const result = await readResponseBody(response);

  if (!response.ok) {
    throw createApiRequestError(result, fallback);
  }

  return (result ?? {}) as T;
}

export async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
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
