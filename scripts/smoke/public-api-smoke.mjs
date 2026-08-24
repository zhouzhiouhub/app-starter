import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { createStorefrontSmokeRequestInit } from "./storefront-smoke-http.mjs";

const fallbackProbeLocale = "de-DE";

export async function assertPublicApi(input, title) {
  const body = await fetchPublicPage(input, {
    locale: input.locale,
    market: input.market,
  });

  assertPublishedPageBody(body, {
    expectedFallback: false,
    expectedLocale: input.locale,
    expectedTitle: title,
  });

  console.log("Public page API passed.");
}

export async function assertPublicFallbackApi(input, title) {
  const locale =
    input.locale === fallbackProbeLocale ? "fr-FR" : fallbackProbeLocale;
  const body = await fetchPublicPage(input, {
    locale,
    market: input.market,
  });

  assertPublishedPageBody(body, {
    expectedFallback: true,
    expectedLocale: input.locale,
    expectedTitle: title,
  });

  console.log("Public page fallback API passed.");
  return {
    fallbackLocale: body?.meta?.fallbackLocale ?? null,
    locale: body?.meta?.locale ?? null,
    requestedLocale: locale,
  };
}

export function isPublicPageFallbackResponse(body, input) {
  return (
    body?.data?.meta?.title === input.title &&
    body?.meta?.locale === input.locale &&
    body?.meta?.fallbackLocale === input.locale &&
    body?.meta?.isFallback === true
  );
}

async function fetchPublicPage(input, context) {
  const params = new URLSearchParams({
    locale: context.locale,
    market: context.market,
  });
  const response = await fetchJson(
    `${input.apiBaseUrl}/public/pages/${encodeURIComponent(input.slug)}?${params}`,
    createStorefrontSmokeRequestInit(input),
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Public page API failed."));
  }

  return response.body;
}

function assertPublishedPageBody(body, input) {
  const diagnostic = readPublicPageBodyDiagnostic(body, input);

  if (!diagnostic.titleMatches) {
    throw createPublicPageBodyFailure(
      `Public page API did not return the published title (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
      diagnostic,
    );
  }

  if (diagnostic.noIndex === true) {
    throw createPublicPageBodyFailure(
      `Public page API returned the smoke page as noIndex (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
      diagnostic,
    );
  }

  if (!diagnostic.localeMatches) {
    throw createPublicPageBodyFailure(
      `Public page API returned an unexpected locale (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
      diagnostic,
    );
  }

  if (!diagnostic.fallbackMatches) {
    throw createPublicPageBodyFailure(
      `Public page API returned an unexpected fallback flag (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
      diagnostic,
    );
  }
}

export function readPublicPageBodyDiagnostic(body, input) {
  const title = body?.data?.meta?.title ?? null;
  const locale = body?.meta?.locale ?? null;
  const fallbackLocale = body?.meta?.fallbackLocale ?? null;
  const isFallback = body?.meta?.isFallback ?? null;

  return {
    diagnosis: readPublicPageBodyDiagnosis({
      fallbackMatches: isFallback === input.expectedFallback,
      localeMatches: locale === input.expectedLocale,
      noIndex: body?.data?.seo?.noIndex === true,
      titleMatches: title === input.expectedTitle,
    }),
    expectedFallback: input.expectedFallback,
    expectedLocale: input.expectedLocale,
    expectedTitle: input.expectedTitle,
    fallbackLocale,
    fallbackMatches: isFallback === input.expectedFallback,
    isFallback,
    locale,
    localeMatches: locale === input.expectedLocale,
    noIndex: body?.data?.seo?.noIndex === true,
    title,
    titleMatches: title === input.expectedTitle,
  };
}

export function formatPublicPageBodyDiagnostic(diagnostic) {
  return `title: ${diagnostic.title ?? "missing"} (expected ${diagnostic.expectedTitle}), locale: ${diagnostic.locale ?? "missing"} (expected ${diagnostic.expectedLocale}), fallback: ${diagnostic.isFallback ?? "missing"} (expected ${diagnostic.expectedFallback}), fallback locale: ${diagnostic.fallbackLocale ?? "missing"}, noIndex: ${diagnostic.noIndex}`;
}

function createPublicPageBodyFailure(message, diagnostic) {
  const error = new Error(message);
  error.smokeDetails = {
    publicApi: diagnostic,
  };
  return error;
}

function readPublicPageBodyDiagnosis(diagnostic) {
  if (!diagnostic.titleMatches) {
    return "title-mismatch";
  }

  if (diagnostic.noIndex === true) {
    return "noindex-page";
  }

  if (!diagnostic.localeMatches) {
    return "locale-mismatch";
  }

  if (!diagnostic.fallbackMatches) {
    return "fallback-mismatch";
  }

  return "published-page-valid";
}
