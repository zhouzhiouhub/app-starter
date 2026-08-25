import { getStorefrontHref } from "../../packages/schema/dist/index.js";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";
import { readSmokeStorefrontOrigin } from "./storefront-smoke-host.mjs";

export function readStorefrontPageAttempt(response, title) {
  const bodyReadError = response.bodyReadError ?? null;
  const documentTitle = bodyReadError ? null : readDocumentTitle(response.text);
  const titlePresent = bodyReadError ? false : response.text.includes(title);

  return {
    bodySnippet:
      response.ok && titlePresent ? null : readBodySnippet(response.text),
    ...(bodyReadError ? { bodyReadError } : {}),
    diagnosis: readStorefrontPageDiagnosis(
      response,
      titlePresent,
      documentTitle,
    ),
    documentTitle,
    ok: response.ok && !bodyReadError,
    ...(response.redirectLocation
      ? { redirectLocation: response.redirectLocation }
      : {}),
    status: response.status,
    statusText: response.statusText || "",
    titlePresent,
  };
}

export function formatStorefrontPageAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const documentTitle = attempt.documentTitle
    ? `, document title: ${JSON.stringify(attempt.documentTitle)}`
    : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";
  const bodyReadError = attempt.bodyReadError
    ? `, body read error: ${attempt.bodyReadError}`
    : "";
  const redirect = attempt.redirectLocation
    ? `, redirect: ${attempt.redirectLocation}`
    : "";

  return `status ${attempt.status}${statusText}, diagnosis: ${attempt.diagnosis}, title present: ${attempt.titlePresent}${documentTitle}${redirect}${bodyReadError}${body}`;
}

export function readRobotsAttempt(response, webUrl) {
  const bodyReadError = response.bodyReadError ?? null;
  const text = bodyReadError ? "" : response.text.toLowerCase();
  const hostUrl = webUrl.toLowerCase();
  const sitemapUrl = joinUrl(webUrl, "/sitemap.xml").toLowerCase();

  return {
    bodySnippet:
      response.ok && !bodyReadError ? null : readBodySnippet(response.text),
    ...(bodyReadError ? { bodyReadError } : {}),
    hasHostLine: hasRobotsDirective(text, "host"),
    hasSitemapLine: text.includes("sitemap:"),
    hasUserAgent: text.includes("user-agent"),
    ok: response.ok && !bodyReadError,
    pointsToHost: hasRobotsDirectiveValue(text, "host", hostUrl),
    pointsToSitemap: text.includes(sitemapUrl),
    status: response.status,
    statusText: response.statusText || "",
  };
}

export function formatRobotsAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";
  const bodyReadError = attempt.bodyReadError
    ? `, body read error: ${attempt.bodyReadError}`
    : "";

  return `status ${attempt.status}${statusText}, user-agent: ${attempt.hasUserAgent}, host line: ${attempt.hasHostLine}, host URL: ${attempt.pointsToHost}, sitemap line: ${attempt.hasSitemapLine}, sitemap URL: ${attempt.pointsToSitemap}${bodyReadError}${body}`;
}

export function readSitemapAttempt(response, expectedUrl) {
  const bodyReadError = response.bodyReadError ?? null;
  const urls = bodyReadError ? [] : parseSitemapUrls(response.text);
  const expectedOrigin = readUrlOrigin(expectedUrl);
  const offOriginUrls = urls.filter(
    (url) => readUrlOrigin(url) !== expectedOrigin,
  );

  return {
    bodySnippet:
      response.ok && !bodyReadError ? null : readBodySnippet(response.text),
    ...(bodyReadError ? { bodyReadError } : {}),
    expectedUrlPresent: urls.includes(expectedUrl),
    firstOffOriginUrl: offOriginUrls[0]
      ? redactSmokeSecrets(offOriginUrls[0])
      : null,
    notFoundUrlPresent: urls.some(isNotFoundSitemapUrl),
    offOriginUrlCount: offOriginUrls.length,
    ok: response.ok && !bodyReadError,
    status: response.status,
    statusText: response.statusText || "",
    urlCount: urls.length,
  };
}

export function formatSitemapAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";
  const bodyReadError = attempt.bodyReadError
    ? `, body read error: ${attempt.bodyReadError}`
    : "";
  const offOrigin = attempt.firstOffOriginUrl
    ? `, first off-origin URL: ${JSON.stringify(attempt.firstOffOriginUrl)}`
    : "";

  return `status ${attempt.status}${statusText}, expected URL present: ${attempt.expectedUrlPresent}, 404 present: ${attempt.notFoundUrlPresent}, off-origin URLs: ${attempt.offOriginUrlCount}, URL count: ${attempt.urlCount}${offOrigin}${bodyReadError}${body}`;
}

export function readNotFoundAttempt(response) {
  const bodyReadError = response.bodyReadError ?? null;
  const noIndex = bodyReadError ? false : hasNoIndexRobots(response.text);

  return {
    bodySnippet:
      response.status === 404 && noIndex
        ? null
        : readBodySnippet(response.text),
    ...(bodyReadError ? { bodyReadError } : {}),
    noIndex,
    status: response.status,
    statusText: response.statusText || "",
  };
}

export function formatNotFoundAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";
  const bodyReadError = attempt.bodyReadError
    ? `, body read error: ${attempt.bodyReadError}`
    : "";

  return `status ${attempt.status}${statusText}, noindex: ${attempt.noIndex}${bodyReadError}${body}`;
}

export function getStorefrontPath(locale, slug) {
  return getStorefrontHref(locale, slug);
}

export function getExpectedStorefrontOrigin(input) {
  return readSmokeStorefrontOrigin(input);
}

export function joinUrl(origin, path) {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function parseSitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) =>
    match[1].trim(),
  );
}

export function hasNoIndexRobots(html) {
  return Array.from(html.matchAll(/<meta\b[^>]*>/gi)).some((match) => {
    const tag = match[0];
    return (
      /\bname=["']robots["']/i.test(tag) &&
      /\bcontent=["'][^"']*\bnoindex\b[^"']*["']/i.test(tag)
    );
  });
}

export function readExpectedCanonicalUrl(input) {
  return joinUrl(
    getExpectedStorefrontOrigin(input),
    getStorefrontPath(input.locale, input.slug),
  );
}

function readBodySnippet(text) {
  const snippet = redactSmokeSecrets(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return snippet || null;
}

function readDocumentTitle(html) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const normalized = title?.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function readStorefrontPageDiagnosis(response, titlePresent, documentTitle) {
  if (response.redirectLocation) {
    return "redirect-response";
  }

  if (response.bodyReadError) {
    return "response-body-too-large";
  }

  if (!response.ok) {
    return "http-error";
  }

  if (titlePresent) {
    return "published-title-present";
  }

  if (hasNoIndexRobots(response.text)) {
    return "noindex-page";
  }

  return documentTitle
    ? "stale-or-fallback-content"
    : "published-title-missing";
}

function isNotFoundSitemapUrl(url) {
  const normalized = url.replace(/\/+$/, "");
  return normalized.endsWith("/404");
}

function readUrlOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function hasRobotsDirective(text, directive) {
  const pattern = new RegExp(`^\\s*${directive}\\s*:`, "im");

  return pattern.test(text);
}

function hasRobotsDirectiveValue(text, directive, expectedValue) {
  const pattern = new RegExp(
    `^\\s*${directive}\\s*:\\s*${escapeRegExp(expectedValue)}\\s*$`,
    "im",
  );

  return pattern.test(text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
