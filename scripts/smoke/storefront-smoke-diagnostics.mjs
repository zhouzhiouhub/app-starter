import { redactSmokeSecrets } from "./smoke-secrets.mjs";
import { readSmokeStorefrontOrigin } from "./storefront-smoke-host.mjs";

export function readStorefrontPageAttempt(response, title) {
  const documentTitle = readDocumentTitle(response.text);
  const titlePresent = response.text.includes(title);

  return {
    bodySnippet:
      response.ok && titlePresent ? null : readBodySnippet(response.text),
    diagnosis: readStorefrontPageDiagnosis(
      response,
      titlePresent,
      documentTitle,
    ),
    documentTitle,
    ok: response.ok,
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

  return `status ${attempt.status}${statusText}, diagnosis: ${attempt.diagnosis}, title present: ${attempt.titlePresent}${documentTitle}${body}`;
}

export function readRobotsAttempt(response, webUrl) {
  const text = response.text.toLowerCase();
  const hostUrl = webUrl.toLowerCase();
  const sitemapUrl = joinUrl(webUrl, "/sitemap.xml").toLowerCase();

  return {
    bodySnippet: response.ok ? null : readBodySnippet(response.text),
    hasHostLine: hasRobotsDirective(text, "host"),
    hasSitemapLine: text.includes("sitemap:"),
    hasUserAgent: text.includes("user-agent"),
    ok: response.ok,
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

  return `status ${attempt.status}${statusText}, user-agent: ${attempt.hasUserAgent}, host line: ${attempt.hasHostLine}, host URL: ${attempt.pointsToHost}, sitemap line: ${attempt.hasSitemapLine}, sitemap URL: ${attempt.pointsToSitemap}${body}`;
}

export function readSitemapAttempt(response, expectedUrl) {
  const urls = parseSitemapUrls(response.text);

  return {
    bodySnippet: response.ok ? null : readBodySnippet(response.text),
    expectedUrlPresent: urls.includes(expectedUrl),
    notFoundUrlPresent: urls.some(isNotFoundSitemapUrl),
    ok: response.ok,
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

  return `status ${attempt.status}${statusText}, expected URL present: ${attempt.expectedUrlPresent}, 404 present: ${attempt.notFoundUrlPresent}, URL count: ${attempt.urlCount}${body}`;
}

export function readNotFoundAttempt(response) {
  const noIndex = hasNoIndexRobots(response.text);

  return {
    bodySnippet:
      response.status === 404 && noIndex
        ? null
        : readBodySnippet(response.text),
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

  return `status ${attempt.status}${statusText}, noindex: ${attempt.noIndex}${body}`;
}

export function getStorefrontPath(locale, slug) {
  const prefix = locale.split("-")[0].toLowerCase();
  return slug === "home" ? `/${prefix}` : `/${prefix}/${slug}`;
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

export function readCanonicalHref(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = readHtmlAttribute(tag, "rel");

    if (
      !rel
        ?.split(/\s+/)
        .some((value) => value.toLowerCase() === "canonical")
    ) {
      continue;
    }

    return readHtmlAttribute(tag, "href");
  }

  return null;
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

function readHtmlAttribute(tag, name) {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = pattern.exec(tag);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function readDocumentTitle(html) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const normalized = title?.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function readStorefrontPageDiagnosis(response, titlePresent, documentTitle) {
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
