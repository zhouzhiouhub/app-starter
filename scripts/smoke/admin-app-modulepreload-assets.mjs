import { readModuleScriptAttempt } from "./admin-app-assets.mjs";
import { formatAdminAppAssetHref } from "./admin-app-asset-diagnostics.mjs";

export async function readModulePreloadSummary(references) {
  const attempts = await Promise.all(
    references
      .filter((reference) => reference.url)
      .map((reference) => readModulePreloadAttempt(reference.url)),
  );
  const failures = attempts
    .filter((attempt) => !attempt.ok || !attempt.hasJavaScriptContentType)
    .map(
      ({
        contentType,
        errorMessage,
        hasJavaScriptContentType,
        redirectLocation,
        status,
        statusText,
        url,
      }) => ({
        contentType,
        errorMessage,
        hasJavaScriptContentType,
        ...(redirectLocation ? { redirectLocation } : {}),
        status,
        statusText,
        url,
      }),
    );
  const urlIssues = references
    .filter((reference) => reference.issue)
    .map(({ href, issue }) => ({ href, issue }));

  return {
    count: references.length,
    failures,
    ok: failures.length === 0 && urlIssues.length === 0,
    urlIssues,
    urls: references
      .filter((reference) => reference.url)
      .map((reference) => reference.url),
  };
}

export function readModulePreloadReferences(text, baseUrl) {
  return [...text.matchAll(/<link\b[^>]*>/gi)]
    .filter((match) => isModulePreloadLink(match[0]))
    .map((match) => readModulePreloadReference(match[0], baseUrl));
}

export function formatModulePreloadIssue(attempt) {
  const firstUrlIssue = attempt.modulePreloadUrlIssues?.[0];

  if (firstUrlIssue) {
    return `, modulepreload URL issue: ${firstUrlIssue.issue}`;
  }

  const firstFailure = attempt.modulePreloadFailures?.[0];

  if (!firstFailure) {
    return "";
  }

  const status = firstFailure.status
    ? `${firstFailure.status}${firstFailure.statusText ? ` ${firstFailure.statusText}` : ""}`
    : "request failed";
  const error = firstFailure.errorMessage
    ? `, modulepreload error: ${firstFailure.errorMessage}`
    : "";
  const redirect = firstFailure.redirectLocation
    ? `, modulepreload redirect: ${firstFailure.redirectLocation}`
    : "";

  return `, modulepreload status: ${status}, modulepreload JavaScript: ${firstFailure.hasJavaScriptContentType}${redirect}${error}`;
}

async function readModulePreloadAttempt(url) {
  const attempt = await readModuleScriptAttempt(url);

  return {
    ...attempt,
    url,
  };
}

function readModulePreloadReference(tag, baseUrl) {
  const href = readAttribute(tag, "href");

  if (!href) {
    return {
      href: null,
      issue: "missing-href",
      url: null,
    };
  }

  try {
    const url = new URL(href, baseUrl);
    const base = new URL(baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return createInvalidModulePreloadReference(href, "unsupported-protocol");
    }

    if (url.username || url.password) {
      return createInvalidModulePreloadReference(href, "embedded-credentials");
    }

    if (url.search || url.hash) {
      return createInvalidModulePreloadReference(href, "unsupported-url-parts");
    }

    if (url.origin !== base.origin) {
      return createInvalidModulePreloadReference(href, "cross-origin");
    }

    return {
      href: formatAdminAppAssetHref(href),
      issue: null,
      url: url.toString(),
    };
  } catch {
    return createInvalidModulePreloadReference(href, "invalid-url");
  }
}

function createInvalidModulePreloadReference(href, issue) {
  return {
    href: formatAdminAppAssetHref(href),
    issue,
    url: null,
  };
}

function isModulePreloadLink(tag) {
  return readAttribute(tag, "rel")
    ?.toLowerCase()
    .split(/\s+/)
    .includes("modulepreload");
}

function readAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}
