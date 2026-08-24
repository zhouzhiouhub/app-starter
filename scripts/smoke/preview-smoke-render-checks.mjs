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
  let lastAttempt = null;

  for (
    let attemptNumber = 1;
    attemptNumber <= input.retryAttempts;
    attemptNumber += 1
  ) {
    try {
      const response = await fetchText(
        url,
        createStorefrontSmokeRequestInit(input),
      );
      const previewAttempt = readWebPreviewAttempt(response, title);

      if (
        previewAttempt.ok &&
        previewAttempt.titlePresent &&
        previewAttempt.noIndex
      ) {
        console.log("Web preview page passed.");
        return;
      }

      lastError = formatWebPreviewAttempt(previewAttempt);
      lastAttempt = previewAttempt;
    } catch (error) {
      lastError = readErrorMessage(error);
      lastAttempt = {
        bodySnippet: null,
        error: lastError,
        noIndex: false,
        ok: false,
        status: null,
        statusText: "",
        titlePresent: false,
      };
    }

    if (attemptNumber < input.retryAttempts) {
      await delay(input.retryDelayMs);
    }
  }

  throw createWebPreviewFailure(
    url,
    title,
    `Web preview page did not render the draft (${lastError}).`,
    lastAttempt,
  );
}

export function getPreviewPath(token) {
  const params = new URLSearchParams({ token });
  return `/preview?${params.toString()}`;
}

export function readWebPreviewAttempt(response, title) {
  const bodyReadError = response.bodyReadError ?? null;
  const titlePresent = bodyReadError ? false : response.text.includes(title);
  const noIndex = bodyReadError ? false : hasNoIndexRobots(response.text);

  return {
    bodySnippet:
      response.ok && !bodyReadError ? null : readBodySnippet(response.text),
    ...(bodyReadError
      ? {
          bodyReadError,
          diagnosis: "response-body-too-large",
        }
      : {}),
    noIndex,
    ok: response.ok && !bodyReadError,
    ...(response.redirectLocation
      ? { redirectLocation: response.redirectLocation }
      : {}),
    status: response.status,
    statusText: response.statusText || "",
    titlePresent,
  };
}

export function formatWebPreviewAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const diagnosis = attempt.diagnosis
    ? `, diagnosis: ${attempt.diagnosis}`
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

  return `status ${attempt.status}${statusText}${diagnosis}, title present: ${attempt.titlePresent}, noindex: ${attempt.noIndex}${redirect}${bodyReadError}${body}`;
}

function createWebPreviewFailure(url, expectedTitle, message, attempt) {
  const error = new Error(message);
  error.smokeDetails = {
    webPreview: {
      ...(attempt ?? {}),
      expectedTitle,
      url: redactSmokeSecrets(url),
    },
  };

  return error;
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
