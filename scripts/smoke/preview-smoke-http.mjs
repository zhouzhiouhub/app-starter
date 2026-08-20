export async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? parseJson(text, url) : null;

  return {
    body,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url,
  };
}

export async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text,
    url,
  };
}

export function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return redactSmokeSecrets(`${fallback} ${response.status}: ${message}`);
}

export function readErrorMessage(error) {
  return redactSmokeSecrets(
    error instanceof Error ? error.message : String(error),
  );
}

export function redactSmokeSecrets(value) {
  return value
    .replace(/(\/public\/preview\/)[^/?#\s)"']+/gi, "$1[redacted]")
    .replace(
      /([?&](?:accessToken|password|previewToken|refreshToken|secret|token)=)[^&#\s)"']+/gi,
      "$1[redacted]",
    )
    .replace(
      /(\b(?:accessToken|password|previewToken|refreshToken|secret|token)=)[^&#\s)"'<]+/gi,
      "$1[redacted]",
    )
    .replace(
      /(\b(?:password|secret|token)\s+)((?:[a-zA-Z0-9_-]+\.)+[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]{24,})/gi,
      "$1[redacted]",
    );
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      redactSmokeSecrets(
        `${url} returned non-JSON content: ${text.slice(0, 160)}`,
      ),
    );
  }
}
