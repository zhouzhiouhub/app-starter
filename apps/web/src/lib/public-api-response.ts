const maxPublicApiJsonBodyLength = 1_000_000;

export async function readPublicApiJson(response: Response): Promise<unknown> {
  if (hasOversizedContentLength(response)) {
    return null;
  }

  const text = await readResponseText(response);

  if (text !== null) {
    return readJsonFromText(text);
  }

  return readJsonFromResponse(response);
}

function readJsonFromText(text: string): unknown {
  if (!text || text.length > maxPublicApiJsonBodyLength) {
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
  const readText = (response as { text?: unknown }).text;

  if (typeof readText !== "function") {
    return null;
  }

  try {
    return (await readText.call(response)) as string;
  } catch {
    return null;
  }
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
