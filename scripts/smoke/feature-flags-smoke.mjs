import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

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
  await assertCommerceReadPlaceholders(input, accessToken);
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
    throw new Error(
      "Public translations did not fall back to the default locale.",
    );
  }
}

async function assertCommerceReadPlaceholders(input, accessToken) {
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/products`,
    accessToken,
    "Products placeholder",
  );
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/orders`,
    accessToken,
    "Orders placeholder",
  );
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
  await assertErrorResponse(
    `${input.apiBaseUrl}/webhooks/stripe`,
    {
      body: JSON.stringify({ id: "evt_smoke_webhook", object: "event" }),
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "t=1,v1=smoke-signature",
      },
      method: "POST",
    },
    "COMMERCE_DISABLED",
  );
}

async function assertEmptyListResponse(url, accessToken, label) {
  const response = await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, `${label} failed.`));
  }

  if (
    !Array.isArray(response.body?.data) ||
    response.body.data.length !== 0
  ) {
    throw new Error(`${label} expected an empty data array.`);
  }
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
  const diagnostic = readDisabledEndpointDiagnostic(response);

  if (diagnostic.status !== 409 || diagnostic.code !== expectedCode) {
    throw new Error(
      `${url} expected 409 ${expectedCode}, got ${formatDisabledEndpointDiagnostic(
        diagnostic,
      )}.`,
    );
  }
}

export function readDisabledEndpointDiagnostic(response) {
  return {
    code: readApiErrorCode(response.body),
    message: redactOptionalSmokeMessage(
      response.body?.error?.message ??
        response.body?.message ??
        response.statusText ??
        null,
    ),
    ...(response.redirectLocation
      ? { redirectLocation: response.redirectLocation }
      : {}),
    status: response.status,
    statusText: response.statusText || "",
  };
}

export function formatDisabledEndpointDiagnostic(diagnostic) {
  const statusText = diagnostic.statusText ? ` ${diagnostic.statusText}` : "";
  const code = diagnostic.code ?? "NO_CODE";
  const message = diagnostic.message ? `: ${diagnostic.message}` : "";
  const redirect = diagnostic.redirectLocation
    ? ` redirect: ${diagnostic.redirectLocation}`
    : "";

  return `${diagnostic.status}${statusText} ${code}${message}${redirect}`;
}

function redactOptionalSmokeMessage(value) {
  return value === null ? null : redactSmokeSecrets(value);
}
