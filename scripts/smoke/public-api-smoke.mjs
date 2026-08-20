import { redactSmokeSecrets } from "./smoke-secrets.mjs";

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
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Public page API failed."));
  }

  return response.body;
}

function assertPublishedPageBody(body, input) {
  const diagnostic = readPublicPageBodyDiagnostic(body, input);

  if (!diagnostic.titleMatches) {
    throw new Error(
      `Public page API did not return the published title (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
    );
  }

  if (diagnostic.noIndex === true) {
    throw new Error(
      `Public page API returned the smoke page as noIndex (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
    );
  }

  if (!diagnostic.localeMatches) {
    throw new Error(
      `Public page API returned an unexpected locale (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
    );
  }

  if (!diagnostic.fallbackMatches) {
    throw new Error(
      `Public page API returned an unexpected fallback flag (${formatPublicPageBodyDiagnostic(
        diagnostic,
      )}).`,
    );
  }
}

export function readPublicPageBodyDiagnostic(body, input) {
  const title = body?.data?.meta?.title ?? null;
  const locale = body?.meta?.locale ?? null;
  const fallbackLocale = body?.meta?.fallbackLocale ?? null;
  const isFallback = body?.meta?.isFallback ?? null;

  return {
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
    throw new Error(
      redactSmokeSecrets(
        `${url} returned non-JSON content: ${text.slice(0, 160)}`,
      ),
    );
  }
}

function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return redactSmokeSecrets(`${fallback} ${response.status}: ${message}`);
}
