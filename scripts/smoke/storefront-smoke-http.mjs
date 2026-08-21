import { redactSmokeSecrets } from "./smoke-secrets.mjs";

const storefrontHostHeaderName = "x-storefront-host";

export async function fetchStorefrontText(url, input, init) {
  const response = await fetch(
    url,
    createStorefrontSmokeRequestInit(input, init),
  );
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text,
    url,
  };
}

export function createStorefrontSmokeRequestInit(input, init = {}) {
  const host = input?.storefrontHost;

  if (!host) {
    return init;
  }

  return {
    ...init,
    headers: {
      ...readHeaderObject(init.headers),
      [storefrontHostHeaderName]: host,
    },
  };
}

export function delayStorefrontSmoke(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function readStorefrontSmokeErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}

function readHeaderObject(headers) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}
