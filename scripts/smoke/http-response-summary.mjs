import { formatSmokeText } from "./smoke-text.mjs";

const maxSmokeRedirectLocationLength = 512;

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

  const location = response.headers.get("location");

  return location
    ? formatSmokeText(location, { maxLength: maxSmokeRedirectLocationLength }) ||
        null
    : null;
}
