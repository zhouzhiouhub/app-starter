import { redactSmokeSecrets } from "./smoke-secrets.mjs";
import {
  cancelResponseBody,
  readRedirectLocation,
} from "./http-response-summary.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";

export async function readModuleScriptAttempt(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const contentType = response.headers.get("content-type");
    const redirectLocation = readRedirectLocation(response);
    await cancelResponseBody(response);

    return {
      contentType,
      errorMessage: null,
      hasJavaScriptContentType: isJavaScriptContentType(contentType),
      ok: response.ok,
      ...(redirectLocation ? { redirectLocation } : {}),
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      contentType: null,
      errorMessage: readErrorMessage(error),
      hasJavaScriptContentType: false,
      ok: false,
      status: null,
      statusText: null,
    };
  }
}

export function createMissingModuleScriptAttempt() {
  return {
    contentType: null,
    errorMessage: null,
    hasJavaScriptContentType: false,
    ok: false,
    status: null,
    statusText: null,
  };
}

export async function readStylesheetSummary(references) {
  const attempts = await Promise.all(
    references
      .filter((reference) => reference.url)
      .map((reference) => readStylesheetAttempt(reference.url)),
  );
  const failures = attempts
    .filter((attempt) => !attempt.ok || !attempt.hasCssContentType)
    .map(
      ({
        contentType,
        errorMessage,
        hasCssContentType,
        redirectLocation,
        status,
        statusText,
        url,
      }) => ({
        contentType,
        errorMessage,
        hasCssContentType,
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

export function readModuleScriptReference(text, baseUrl) {
  const src = readModuleScriptSrc(text);

  if (!src) {
    return {
      issue: null,
      present: false,
      url: null,
    };
  }

  try {
    const url = new URL(src, baseUrl);
    const base = new URL(baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return createInvalidModuleScriptReference("unsupported-protocol");
    }

    if (url.username || url.password) {
      return createInvalidModuleScriptReference("embedded-credentials");
    }

    if (url.search || url.hash) {
      return createInvalidModuleScriptReference("unsupported-url-parts");
    }

    if (url.origin !== base.origin) {
      return createInvalidModuleScriptReference("cross-origin");
    }

    return {
      issue: null,
      present: true,
      url: url.toString(),
    };
  } catch {
    return createInvalidModuleScriptReference("invalid-url");
  }
}

export function readStylesheetReferences(text, baseUrl) {
  return [...text.matchAll(/<link\b[^>]*>/gi)]
    .filter((match) => isStylesheetLink(match[0]))
    .map((match) => readStylesheetReference(match[0], baseUrl));
}

export function formatStylesheetIssue(attempt) {
  const firstUrlIssue = attempt.stylesheetUrlIssues?.[0];

  if (firstUrlIssue) {
    return `, stylesheet URL issue: ${firstUrlIssue.issue}`;
  }

  const firstFailure = attempt.stylesheetFailures?.[0];

  if (!firstFailure) {
    return "";
  }

  const status = firstFailure.status
    ? `${firstFailure.status}${firstFailure.statusText ? ` ${firstFailure.statusText}` : ""}`
    : "request failed";
  const error = firstFailure.errorMessage
    ? `, stylesheet error: ${firstFailure.errorMessage}`
    : "";
  const redirect = firstFailure.redirectLocation
    ? `, stylesheet redirect: ${firstFailure.redirectLocation}`
    : "";

  return `, stylesheet status: ${status}, stylesheet CSS: ${firstFailure.hasCssContentType}${redirect}${error}`;
}

async function readStylesheetAttempt(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    const contentType = response.headers.get("content-type");
    const redirectLocation = readRedirectLocation(response);
    await cancelResponseBody(response);

    return {
      contentType,
      errorMessage: null,
      hasCssContentType: isCssContentType(contentType),
      ok: response.ok,
      ...(redirectLocation ? { redirectLocation } : {}),
      status: response.status,
      statusText: response.statusText,
      url,
    };
  } catch (error) {
    return {
      contentType: null,
      errorMessage: readErrorMessage(error),
      hasCssContentType: false,
      ok: false,
      status: null,
      statusText: null,
      url,
    };
  }
}

function readStylesheetReference(tag, baseUrl) {
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
      return createInvalidStylesheetReference(href, "unsupported-protocol");
    }

    if (url.username || url.password) {
      return createInvalidStylesheetReference(href, "embedded-credentials");
    }

    if (url.search || url.hash) {
      return createInvalidStylesheetReference(href, "unsupported-url-parts");
    }

    if (url.origin !== base.origin) {
      return createInvalidStylesheetReference(href, "cross-origin");
    }

    return {
      href: redactSmokeSecrets(href),
      issue: null,
      url: url.toString(),
    };
  } catch {
    return createInvalidStylesheetReference(href, "invalid-url");
  }
}

function createInvalidStylesheetReference(href, issue) {
  return {
    href: href ? redactSmokeSecrets(href) : null,
    issue,
    url: null,
  };
}

function isStylesheetLink(tag) {
  return readAttribute(tag, "rel")
    ?.toLowerCase()
    .split(/\s+/)
    .includes("stylesheet");
}

function createInvalidModuleScriptReference(issue) {
  return {
    issue,
    present: true,
    url: null,
  };
}

function readModuleScriptSrc(text) {
  for (const match of text.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0];

    if (readAttribute(tag, "type")?.toLowerCase() === "module") {
      const src = readAttribute(tag, "src");

      if (src) {
        return src;
      }
    }
  }

  return null;
}

function readAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function isJavaScriptContentType(value) {
  return (
    typeof value === "string" &&
    /\b(?:application|text)\/(?:javascript|x-javascript|ecmascript)\b/i.test(
      value,
    )
  );
}

function isCssContentType(value) {
  return typeof value === "string" && /\btext\/css\b/i.test(value);
}
