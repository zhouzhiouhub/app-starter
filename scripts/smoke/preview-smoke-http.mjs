import {
  fetchJson,
  readHttpError,
} from "./http-json-smoke.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export { fetchJson, readHttpError, redactSmokeSecrets };

export async function fetchText(url, init) {
  const response = await fetch(url, {
    ...init,
    redirect: init?.redirect ?? "manual",
  });
  const text = await response.text();
  const redirectLocation = readRedirectLocation(response);

  return {
    ok: response.ok,
    ...(redirectLocation ? { redirectLocation } : {}),
    status: response.status,
    statusText: response.statusText,
    text,
    url,
  };
}

export function readErrorMessage(error) {
  return redactSmokeSecrets(
    error instanceof Error ? error.message : String(error),
  );
}

function readRedirectLocation(response) {
  if (response.status < 300 || response.status >= 400) {
    return null;
  }

  const location = response.headers.get("location")?.trim();

  return location ? redactSmokeSecrets(location) : null;
}
