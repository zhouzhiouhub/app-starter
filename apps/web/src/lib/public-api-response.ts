const maxPublicApiJsonBodyLength = 1_000_000;

export async function readPublicApiJson(response: Response): Promise<unknown> {
  if (hasOversizedContentLength(response)) {
    await cancelPublicApiResponseBody(response);
    return null;
  }

  const text = await readResponseText(response);

  if (text !== null) {
    return readJsonFromText(text);
  }

  return readJsonFromResponse(response);
}

export async function cancelPublicApiResponseBody(
  response: Response,
): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    return;
  }
}

function readJsonFromText(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function hasOversizedContentLength(response: Response): boolean {
  const value = readContentLength(response);

  if (!value) {
    return false;
  }

  const length = Number(value);

  return Number.isFinite(length) && length > maxPublicApiJsonBodyLength;
}

function readContentLength(response: Response): string | null {
  const headers = (response as { headers?: { get?: unknown } }).headers;

  if (!headers || typeof headers.get !== "function") {
    return null;
  }

  return headers.get("content-length");
}

async function readResponseText(response: Response): Promise<string | null> {
  const stream = (response as { body?: unknown }).body;

  if (isReadableByteStream(stream)) {
    return readResponseStreamText(stream);
  }

  const readText = (response as { text?: unknown }).text;

  if (typeof readText !== "function") {
    return null;
  }

  try {
    const text = (await readText.call(response)) as string;

    return hasOversizedText(text) ? null : text;
  } catch {
    return null;
  }
}

async function readResponseStreamText(
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

      if (byteLength > maxPublicApiJsonBodyLength) {
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
  return new TextEncoder().encode(text).byteLength > maxPublicApiJsonBodyLength;
}

async function readJsonFromResponse(response: Response): Promise<unknown> {
  const readJson = (response as { json?: unknown }).json;

  if (typeof readJson !== "function") {
    return null;
  }

  try {
    return await readJson.call(response);
  } catch {
    return null;
  }
}
