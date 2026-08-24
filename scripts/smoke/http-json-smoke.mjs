import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function assertJsonReachable(url, label) {
  const response = await fetchJson(url);

  if (!response.ok) {
    throw new Error(readHttpError(response, `${label} failed.`));
  }

  console.log(`${label} passed.`);
}

export async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? parseJson(text, url) : null;
  const redirectLocation = readRedirectLocation(response);

  return {
    body,
    ok: response.ok,
    ...(redirectLocation ? { redirectLocation } : {}),
    status: response.status,
    statusText: response.statusText,
    url,
  };
}

export function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  const redirect = response.redirectLocation
    ? ` redirect: ${response.redirectLocation}`
    : "";

  return redactSmokeSecrets(`${fallback} ${response.status}: ${message}${redirect}`);
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

function readRedirectLocation(response) {
  if (response.status < 300 || response.status >= 400) {
    return null;
  }

  const location = response.headers.get("location")?.trim();

  return location ? redactSmokeSecrets(location) : null;
}
