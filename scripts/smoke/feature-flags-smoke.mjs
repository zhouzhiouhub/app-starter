import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  assertCommerceDisabled,
  assertCommerceReadPlaceholders,
} from "./feature-flags-smoke-commerce.mjs";
import { assertErrorResponse } from "./feature-flags-smoke-disabled-endpoint.mjs";

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
  await assertLocalizationReadPlaceholders(input, accessToken);
  await assertTranslationBulkCapabilities(input, accessToken);
  await assertCommerceReadPlaceholders(input, accessToken);
  await assertCommerceDisabled(input, accessToken);
  await assertLocaleCreationDisabled(input, accessToken);
  await assertLocaleUpdateDisabled(input, accessToken);

  console.log("MVP feature flags passed.");
}

export {
  formatDisabledEndpointDiagnostic,
  readApiErrorCode,
  readDisabledEndpointDiagnostic,
} from "./feature-flags-smoke-disabled-endpoint.mjs";

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

async function assertLocalizationReadPlaceholders(input, accessToken) {
  const markets = await fetchAdminJson(
    `${input.apiBaseUrl}/markets`,
    accessToken,
    "Markets placeholder",
  );
  const market = readSingleRecord(markets, "Markets placeholder");

  if (
    market.code !== expectedConfig.defaultMarket ||
    market.defaultLocale !== expectedConfig.defaultLocale ||
    market.currency !== expectedConfig.defaultCurrency ||
    market.status !== "active"
  ) {
    throw new Error("Markets placeholder did not expose the default market.");
  }

  const locales = await fetchAdminJson(
    `${input.apiBaseUrl}/locales`,
    accessToken,
    "Locales placeholder",
  );
  const locale = readSingleRecord(locales, "Locales placeholder");

  if (
    locale.code !== expectedConfig.defaultLocale ||
    locale.fallbackLocale !== expectedConfig.fallbackLocale ||
    locale.status !== "active"
  ) {
    throw new Error("Locales placeholder did not expose the default locale.");
  }

  const translations = await fetchAdminJson(
    `${input.apiBaseUrl}/translations?locale=de-DE`,
    accessToken,
    "Translations placeholder",
  );

  if (!Array.isArray(translations.body?.data)) {
    throw new Error("Translations placeholder expected a data array.");
  }

  if (
    translations.body?.meta?.locale !== expectedConfig.defaultLocale ||
    translations.body?.meta?.fallbackLocale !== expectedConfig.fallbackLocale ||
    translations.body?.meta?.isFallback !== true
  ) {
    throw new Error(
      "Translations placeholder did not fall back to the default locale.",
    );
  }
}

async function assertTranslationBulkCapabilities(input, accessToken) {
  await assertErrorResponse(
    `${input.apiBaseUrl}/translations/import`,
    {
      body: JSON.stringify({
        entries: [
          {
            key: "page.home.smoke.import",
            locale: "de-DE",
            value: "Smoke import",
          },
        ],
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "d59af848-cb88-4267-929f-65b14d9f8f30",
      },
      method: "POST",
    },
    "MULTI_LOCALE_DISABLED",
  );
  const exportResponse = await fetchAdminJson(
    `${input.apiBaseUrl}/translations/export`,
    accessToken,
    "Translation export",
    {
      body: JSON.stringify({ locale: "de-DE" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );

  if (
    exportResponse.body?.data?.contentType !== "application/json" ||
    exportResponse.body?.data?.format !== "json" ||
    !Array.isArray(exportResponse.body?.data?.entries)
  ) {
    throw new Error("Translation export did not return a JSON payload.");
  }

  if (
    exportResponse.body?.meta?.locale !== expectedConfig.defaultLocale ||
    exportResponse.body?.meta?.fallbackLocale !==
      expectedConfig.fallbackLocale ||
    exportResponse.body?.meta?.isFallback !== true
  ) {
    throw new Error(
      "Translation export did not fall back to the default locale.",
    );
  }
}

async function fetchAdminJson(url, accessToken, label, init = {}) {
  const response = await fetchJson(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, `${label} failed.`));
  }

  return response;
}

function readSingleRecord(response, label) {
  if (!Array.isArray(response.body?.data) || response.body.data.length !== 1) {
    throw new Error(`${label} expected a single data record.`);
  }

  return response.body.data[0];
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

async function assertLocaleUpdateDisabled(input, accessToken) {
  await assertErrorResponse(
    `${input.apiBaseUrl}/locales/de-DE`,
    {
      body: JSON.stringify({ displayName: "German", status: "active" }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "f0ace319-8e0a-4bb8-82db-79c7bc00541e",
      },
      method: "PATCH",
    },
    "MULTI_LOCALE_DISABLED",
  );
}
