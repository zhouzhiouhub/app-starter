import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function cancelResponseBody(response) {
  try {
    await response.body?.cancel?.();
  } catch {
    // Header-only smoke checks release response bodies on a best-effort basis.
  }
}

export function readRedirectLocation(response) {
  if (response.status < 300 || response.status >= 400) {
    return null;
  }

  const location = response.headers.get("location")?.trim();

  return location ? redactSmokeSecrets(location) : null;
}
