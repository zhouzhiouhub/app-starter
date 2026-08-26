import { readBoundedResponseText } from "./bounded-response-text.mjs";
import {
  cancelResponseBody,
  readRedirectLocation,
} from "./http-response-summary.mjs";
import {
  readRedactedSmokeSnippet,
  redactSmokeSecrets,
} from "./smoke-secrets.mjs";

export async function assertJsonReachable(url, label) {
  const response = await fetchJson(url);

  if (!response.ok) {
    throw new Error(readHttpError(response, `${label} failed.`));
  }

  console.log(`${label} passed.`);
}

export async function fetchJson(url, init) {
  const response = await fetch(url, {
    ...init,
    redirect: init?.redirect ?? "manual",
  });
  const redirectLocation = readRedirectLocation(response);
  if (redirectLocation) {
    await cancelResponseBody(response);
  }
  const body = redirectLocation
    ? null
    : await readJsonResponseBody(response, url);

  return {
    body,
    ok: response.ok,
    ...(redirectLocation ? { redirectLocation } : {}),
    status: response.status,
    statusText: response.statusText,
    url,
  };
}

export function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  const redirect = response.redirectLocation
    ? ` redirect: ${response.redirectLocation}`
    : "";

  return redactSmokeSecrets(`${fallback} ${response.status}: ${message}${redirect}`);
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      redactSmokeSecrets(
        `${url} returned non-JSON content: ${readRedactedSmokeSnippet(
          text,
          160,
        )}`,
      ),
    );
  }
}

async function readJsonResponseBody(response, url) {
  const text = await readBoundedResponseText(response, {
    label: "JSON",
    url,
  });

  if (!text) {
    return null;
  }

  return parseJson(text, url);
}
