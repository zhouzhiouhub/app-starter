import {
  fetchJson,
  fetchText,
  readErrorMessage,
  readHttpError,
  redactSmokeSecrets,
} from "./preview-smoke-http.mjs";
import { hasNoIndexRobots, joinUrl } from "./storefront-smoke.mjs";
import { createStorefrontSmokeRequestInit } from "./storefront-smoke-http.mjs";

export async function assertPublicPreview(input, token, title) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/public/preview/${encodeURIComponent(token)}`,
    createStorefrontSmokeRequestInit(input),
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Public preview API failed."));
  }

  if (response.body?.data?.meta?.title !== title) {
    throw new Error("Public preview API did not return the draft title.");
  }

  if (response.body?.meta?.preview !== true) {
    throw new Error("Public preview API did not mark the response as preview.");
  }

  console.log("Public preview API passed.");
}

export async function assertWebPreview(input, token, title) {
  const url = joinUrl(input.webUrl, getPreviewPath(token));
  let lastError = "";

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetchText(
        url,
        createStorefrontSmokeRequestInit(input),
      );
      const attempt = readWebPreviewAttempt(response, title);

      if (attempt.ok && attempt.titlePresent && attempt.noIndex) {
        console.log("Web preview page passed.");
        return;
      }

      lastError = formatWebPreviewAttempt(attempt);
    } catch (error) {
      lastError = readErrorMessage(error);
    }

    if (attempt < input.retryAttempts) {
      await delay(input.retryDelayMs);
    }
  }

  throw new Error(`Web preview page did not render the draft (${lastError}).`);
}

export function getPreviewPath(token) {
  const params = new URLSearchParams({ token });
  return `/preview?${params.toString()}`;
}

export function readWebPreviewAttempt(response, title) {
  const titlePresent = response.text.includes(title);
  const noIndex = hasNoIndexRobots(response.text);

  return {
    bodySnippet: response.ok ? null : readBodySnippet(response.text),
    noIndex,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText || "",
    titlePresent,
  };
}

export function formatWebPreviewAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";

  return `status ${attempt.status}${statusText}, title present: ${attempt.titlePresent}, noindex: ${attempt.noIndex}${body}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readBodySnippet(text) {
  const snippet = redactSmokeSecrets(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return snippet || null;
}
