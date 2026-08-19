const expectedConfig = {
  commerceEnabled: false,
  defaultCurrency: "USD",
  defaultLocale: "en-US",
  defaultMarket: "us",
  fallbackLocale: "en-US",
  multiLocaleEnabled: false,
};

export async function assertFeatureFlagsDisabled(input, accessToken) {
  await assertPublicConfig(input);
  await assertPublicTranslationFallback(input);
  await assertCommerceDisabled(input);
  await assertLocaleCreationDisabled(input, accessToken);

  console.log("MVP feature flags passed.");
}

export function readApiErrorCode(body) {
  return body?.error?.code ?? body?.code ?? null;
}

async function assertPublicConfig(input) {
  const response = await fetchJson(`${input.apiBaseUrl}/public/config`);

  if (!response.ok) {
    throw new Error(readHttpError(response, "Public config failed."));
  }

  for (const [key, expected] of Object.entries(expectedConfig)) {
    if (response.body?.data?.[key] !== expected) {
      throw new Error(
        `Public config expected ${key}=${expected}, got ${response.body?.data?.[key]}.`,
      );
    }
  }
}

async function assertPublicTranslationFallback(input) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/public/translations/de-DE`,
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Public translations failed."));
  }

  if (
    response.body?.meta?.locale !== expectedConfig.defaultLocale ||
    response.body?.meta?.fallbackLocale !== expectedConfig.defaultLocale ||
    response.body?.meta?.isFallback !== true
  ) {
    throw new Error("Public translations did not fall back to the default locale.");
  }
}

async function assertCommerceDisabled(input) {
  await assertErrorResponse(
    `${input.apiBaseUrl}/public/cart`,
    {
      body: JSON.stringify({ sku: "smoke-sku", quantity: 1 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    "COMMERCE_DISABLED",
  );
  await assertErrorResponse(
    `${input.apiBaseUrl}/public/checkout`,
    {
      body: JSON.stringify({ cartId: "smoke-cart" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    "COMMERCE_DISABLED",
  );
}

async function assertLocaleCreationDisabled(input, accessToken) {
  await assertErrorResponse(
    `${input.apiBaseUrl}/locales`,
    {
      body: JSON.stringify({ code: "de-DE", label: "German" }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "MULTI_LOCALE_DISABLED",
  );
}

async function assertErrorResponse(url, init, expectedCode) {
  const response = await fetchJson(url, init);
  const code = readApiErrorCode(response.body);

  if (response.status !== 409 || code !== expectedCode) {
    throw new Error(
      `${url} expected 409 ${expectedCode}, got ${response.status} ${code ?? "NO_CODE"}.`,
    );
  }
}

async function fetchJson(url, init) {
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

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON content: ${text.slice(0, 160)}`);
  }
}

function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return `${fallback} ${response.status}: ${message}`;
}
