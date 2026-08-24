export const maxRevalidateRequestBodyBytes = 10_000;

export type RevalidateBodyReadable = {
  body?: unknown;
  headers?: { get?: unknown };
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

export type RevalidateRequestBodyResult =
  | { reason: null; value: unknown }
  | { reason: "body-too-large" | "invalid-json" };

export async function readRevalidateRequestBody(
  request: RevalidateBodyReadable,
): Promise<RevalidateRequestBodyResult> {
  if (hasOversizedContentLength(request)) {
    return { reason: "body-too-large" };
  }

  if (isReadableByteStream(request.body)) {
    const text = await readBoundedRequestStream(request.body);

    return text === null ? { reason: "body-too-large" } : parseJsonText(text);
  }

  if (typeof request.text === "function") {
    try {
      const text = await request.text();

      return hasOversizedText(text)
        ? { reason: "body-too-large" }
        : parseJsonText(text);
    } catch {
      return { reason: "invalid-json" };
    }
  }

  if (typeof request.json === "function") {
    try {
      return { reason: null, value: await request.json() };
    } catch {
      return { reason: "invalid-json" };
    }
  }

  return { reason: "invalid-json" };
}

function parseJsonText(text: string): RevalidateRequestBodyResult {
  try {
    return { reason: null, value: JSON.parse(text) as unknown };
  } catch {
    return { reason: "invalid-json" };
  }
}

async function readBoundedRequestStream(
  stream: ReadableStream<Uint8Array>,
): Promise<string | null> {
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

      if (byteLength > maxRevalidateRequestBodyBytes) {
        await reader.cancel();
        return null;
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

  return chunks.join("");
}

function hasOversizedContentLength(request: RevalidateBodyReadable): boolean {
  const value = readContentLength(request);

  if (!value) {
    return false;
  }

  const length = Number(value);

  return Number.isFinite(length) && length > maxRevalidateRequestBodyBytes;
}

function readContentLength(request: RevalidateBodyReadable): string | null {
  const get = request.headers?.get;

  return typeof get === "function"
    ? (get.call(request.headers, "content-length") ?? null)
    : null;
}

function isReadableByteStream(
  value: unknown,
): value is ReadableStream<Uint8Array> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "getReader" in value &&
      typeof (value as { getReader?: unknown }).getReader === "function",
  );
}

function hasOversizedText(text: string): boolean {
  return (
    new TextEncoder().encode(text).byteLength > maxRevalidateRequestBodyBytes
  );
}
