import {
  createMissingModuleScriptAttempt,
  formatStylesheetIssue,
  readModuleScriptAttempt,
  readModuleScriptReference,
  readStylesheetReferences,
  readStylesheetSummary,
} from "./admin-app-assets.mjs";
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
      stylesheetCount: 0,
      stylesheetFailures: [],
      stylesheetOk: false,
      stylesheetUrlIssues: [],
      stylesheetUrls: [],
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
    const stylesheet = await readStylesheetSummary(
      readStylesheetReferences(text, url),
    );
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
      stylesheetCount: stylesheet.count,
      stylesheetFailures: stylesheet.failures,
      stylesheetOk: stylesheet.ok,
      stylesheetUrlIssues: stylesheet.urlIssues,
      stylesheetUrls: stylesheet.urls,
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
      stylesheetCount: 0,
      stylesheetFailures: [],
      stylesheetOk: false,
      stylesheetUrlIssues: [],
      stylesheetUrls: [],
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
  const stylesheets =
    `, stylesheet count: ${attempt.stylesheetCount}` +
    `, stylesheets ok: ${attempt.stylesheetOk}`;
  const stylesheetIssue = formatStylesheetIssue(attempt);

  return `${status}${content}, root element present: ${attempt.hasRootElement}${moduleScript}${moduleStatus}${moduleError}${moduleUrlIssue}${stylesheets}${stylesheetIssue}${body}${error}`;
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
    attempt.moduleScriptHasJavaScriptContentType &&
    attempt.stylesheetOk
  );
}

function isHtmlContentType(value) {
  return typeof value === "string" && /\btext\/html\b/i.test(value);
}

function readBodySnippet(text) {
  const normalized = redactSmokeSecrets(text).replace(/\s+/g, " ").trim();

  return normalized ? normalized.slice(0, 240) : null;
}

function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
