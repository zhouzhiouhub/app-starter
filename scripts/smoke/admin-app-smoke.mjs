import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function assertAdminApp(input) {
  if (!input.adminUrl) {
    throw createAdminAppFailure({
      bodySnippet: null,
      contentType: null,
      errorMessage: "ADMIN_URL is required when SMOKE_REQUIRE_ADMIN_APP=true.",
      hasRootElement: false,
      ok: false,
      status: null,
      statusText: null,
      url: null,
    });
  }

  const attempt = await readAdminAppAttempt(input.adminUrl);

  if (attempt.ok && attempt.hasRootElement) {
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

    return {
      bodySnippet: response.ok && hasRootElement ? null : readBodySnippet(text),
      contentType: response.headers.get("content-type"),
      hasRootElement,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
    };
  } catch (error) {
    return {
      bodySnippet: null,
      contentType: null,
      errorMessage: readErrorMessage(error),
      hasRootElement: false,
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
  const body = attempt.bodySnippet ? `, body: "${attempt.bodySnippet}"` : "";
  const error = attempt.errorMessage ? `, error: ${attempt.errorMessage}` : "";

  return `${status}, root element present: ${attempt.hasRootElement}${body}${error}`;
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

function readBodySnippet(text) {
  const normalized = redactSmokeSecrets(text).replace(/\s+/g, " ").trim();

  return normalized ? normalized.slice(0, 240) : null;
}

function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
