import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function fetchStorefrontText(url, init) {
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

export function delayStorefrontSmoke(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function readStorefrontSmokeErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
