import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function assertAdminApp(input) {
  if (!input.adminUrl) {
    throw createAdminAppFailure({
      bodySnippet: null,
      contentType: null,
      errorMessage: "ADMIN_URL is required when SMOKE_REQUIRE_ADMIN_APP=true.",
      hasHtmlContentType: false,
      hasModuleScript: false,
      hasRootElement: false,
      moduleScriptContentType: null,
      moduleScriptErrorMessage: null,
      moduleScriptHasJavaScriptContentType: false,
      moduleScriptOk: false,
      moduleScriptStatus: null,
      moduleScriptStatusText: null,
      moduleScriptUrl: null,
      moduleScriptUrlIssue: null,
      ok: false,
      status: null,
      statusText: null,
      url: null,
    });
  }

  const attempt = await readAdminAppAttempt(input.adminUrl);

  if (isAdminAppAttemptPassing(attempt)) {
    console.log("Admin app passed.");
    return attempt;
  }

  throw createAdminAppFailure(attempt);
}

export async function readAdminAppAttempt(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const hasRootElement = hasAdminRootElement(text);
    const contentType = response.headers.get("content-type");
    const hasHtmlContentType = isHtmlContentType(contentType);
    const moduleScriptReference = readModuleScriptReference(text, url);
    const moduleScript = moduleScriptReference.url
      ? await readModuleScriptAttempt(moduleScriptReference.url)
      : createMissingModuleScriptAttempt();
    const attempt = {
      bodySnippet: null,
      contentType,
      hasHtmlContentType,
      hasModuleScript: moduleScriptReference.present,
      hasRootElement,
      moduleScriptContentType: moduleScript.contentType,
      moduleScriptErrorMessage: moduleScript.errorMessage,
      moduleScriptHasJavaScriptContentType:
        moduleScript.hasJavaScriptContentType,
      moduleScriptOk: moduleScript.ok,
      moduleScriptStatus: moduleScript.status,
      moduleScriptStatusText: moduleScript.statusText,
      moduleScriptUrl: moduleScriptReference.url,
      moduleScriptUrlIssue: moduleScriptReference.issue,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
    };

    return {
      ...attempt,
      bodySnippet: isAdminAppAttemptPassing(attempt)
        ? null
        : readBodySnippet(text),
    };
  } catch (error) {
    return {
      bodySnippet: null,
      contentType: null,
      errorMessage: readErrorMessage(error),
      hasHtmlContentType: false,
      hasModuleScript: false,
      hasRootElement: false,
      moduleScriptContentType: null,
      moduleScriptErrorMessage: null,
      moduleScriptHasJavaScriptContentType: false,
      moduleScriptOk: false,
      moduleScriptStatus: null,
      moduleScriptStatusText: null,
      moduleScriptUrl: null,
      moduleScriptUrlIssue: null,
      ok: false,
      status: null,
      statusText: null,
      url,
    };
  }
}

export function formatAdminAppAttempt(attempt) {
  const status =
    attempt.status === null
      ? "request failed"
      : `status ${attempt.status}${attempt.statusText ? ` ${attempt.statusText}` : ""}`;
  const content = `, html content: ${attempt.hasHtmlContentType}`;
  const moduleScript =
    `, module script present: ${attempt.hasModuleScript}` +
    `, module script reachable: ${attempt.moduleScriptOk}` +
    `, module script JavaScript: ${attempt.moduleScriptHasJavaScriptContentType}`;
  const moduleStatus = attempt.moduleScriptStatus
    ? `, module script status: ${attempt.moduleScriptStatus}${attempt.moduleScriptStatusText ? ` ${attempt.moduleScriptStatusText}` : ""}`
    : "";
  const moduleError = attempt.moduleScriptErrorMessage
    ? `, module script error: ${attempt.moduleScriptErrorMessage}`
    : "";
  const moduleUrlIssue = attempt.moduleScriptUrlIssue
    ? `, module script URL issue: ${attempt.moduleScriptUrlIssue}`
    : "";
  const body = attempt.bodySnippet ? `, body: "${attempt.bodySnippet}"` : "";
  const error = attempt.errorMessage ? `, error: ${attempt.errorMessage}` : "";

  return `${status}${content}, root element present: ${attempt.hasRootElement}${moduleScript}${moduleStatus}${moduleError}${moduleUrlIssue}${body}${error}`;
}

function createAdminAppFailure(attempt) {
  const error = new Error(
    `Admin app smoke failed. ${formatAdminAppAttempt(attempt)}`,
  );
  error.smokeDetails = { adminApp: attempt };

  return error;
}

function hasAdminRootElement(text) {
  return /<div\s+[^>]*id=["']root["'][^>]*>/i.test(text);
}

function isAdminAppAttemptPassing(attempt) {
  return (
    attempt.ok &&
    attempt.hasHtmlContentType &&
    attempt.hasRootElement &&
    attempt.hasModuleScript &&
    attempt.moduleScriptUrlIssue === null &&
    attempt.moduleScriptOk &&
    attempt.moduleScriptHasJavaScriptContentType
  );
}

async function readModuleScriptAttempt(url) {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type");

    return {
      contentType,
      errorMessage: null,
      hasJavaScriptContentType: isJavaScriptContentType(contentType),
      ok: response.ok,
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

function createMissingModuleScriptAttempt() {
  return {
    contentType: null,
    errorMessage: null,
    hasJavaScriptContentType: false,
    ok: false,
    status: null,
    statusText: null,
  };
}

function readModuleScriptReference(text, baseUrl) {
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

function isHtmlContentType(value) {
  return typeof value === "string" && /\btext\/html\b/i.test(value);
}

function isJavaScriptContentType(value) {
  return (
    typeof value === "string" &&
    /\b(?:application|text)\/(?:javascript|x-javascript|ecmascript)\b/i.test(
      value,
    )
  );
}

function readBodySnippet(text) {
  const normalized = redactSmokeSecrets(text).replace(/\s+/g, " ").trim();

  return normalized ? normalized.slice(0, 240) : null;
}

function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
