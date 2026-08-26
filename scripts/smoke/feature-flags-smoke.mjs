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
  await assertTranslationBulkReserved(input, accessToken);
  await assertCommerceReadPlaceholders(input, accessToken);
  await assertCommerceDisabled(input);
  await assertLocaleCreationDisabled(input, accessToken);

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

async function assertTranslationBulkReserved(input, accessToken) {
  await assertErrorResponse(
    `${input.apiBaseUrl}/translations/import`,
    {
      body: JSON.stringify({ entries: [] }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "CONFLICT",
  );
  await assertErrorResponse(
    `${input.apiBaseUrl}/translations/export`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
    },
    "CONFLICT",
  );
}

async function fetchAdminJson(url, accessToken, label) {
  const response = await fetchJson(url, {
    headers: {
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
