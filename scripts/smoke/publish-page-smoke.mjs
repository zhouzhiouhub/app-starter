import { randomUUID } from "node:crypto";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  assertRevalidationSmokeTargets,
  createRevalidationSmokeDetails,
} from "./revalidation-smoke.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

const maxRevalidationLogLineLength = 220;
const maxRevalidationLogPathLength = 96;
const maxRevalidationLogPathCount = 3;

export async function publishPage(input, accessToken, pageId, schema) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/publish`,
    {
      body: JSON.stringify(schema),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Publish request failed."));
  }

  console.log("Publish API passed.");
  return response.body;
}

export function assertPublishedResponse(response, input, title) {
  const schema = response?.data;

  if (schema?.meta?.slug !== input.slug || schema?.meta?.title !== title) {
    throw new Error("Publish response did not include the expected schema.");
  }

  const revalidation = response?.meta?.revalidation;

  if (input.requireRevalidation && revalidation?.triggered !== true) {
    throw createPublishRevalidationFailure(revalidation, input);
  }

  if (input.requireRevalidation) {
    assertRevalidationSmokeTargets(revalidation, input);
  }

  if (revalidation?.triggered === true) {
    console.log(formatRevalidationSuccessLog(revalidation.paths));
  } else {
    console.log("Storefront revalidation skipped by configuration.");
  }
}

function createPublishRevalidationFailure(revalidation, input) {
  const details = createRevalidationSmokeDetails(revalidation, input);
  const error = new Error(formatPublishRevalidationDetails(details));
  error.smokeDetails = { revalidation: details };

  return error;
}

export function formatPublishRevalidationFailure(revalidation, input) {
  return formatPublishRevalidationDetails(
    createRevalidationSmokeDetails(revalidation, input),
  );
}

function formatPublishRevalidationDetails(details) {
  return [
    "Storefront revalidation was not triggered",
    `(diagnosis: ${details.diagnosis},`,
    `reason: ${details.reason ?? "unknown"},`,
    `status: ${details.status ?? "none"},`,
    `paths: ${details.pathCount},`,
    `tags: ${details.tagCount}).`,
  ].join(" ");
}

function formatRevalidationSuccessLog(paths) {
  return truncateText(
    `Storefront revalidation passed: ${formatRevalidationLogPaths(paths)}`,
    maxRevalidationLogLineLength,
  );
}

function formatRevalidationLogPaths(value) {
  const paths = Array.isArray(value)
    ? value.map((item) => formatRevalidationLogPath(item)).filter(Boolean)
    : [];

  if (paths.length === 0) {
    return "paths unavailable";
  }

  const visiblePaths = paths.slice(0, maxRevalidationLogPathCount);
  const hiddenCount = paths.length - visiblePaths.length;
  const suffix = hiddenCount > 0 ? `, ... (${hiddenCount} more)` : "";

  return `${visiblePaths.join(", ")}${suffix}`;
}

function formatRevalidationLogPath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return truncateText(
    normalizeLogText(redactSmokeSecrets(value)),
    maxRevalidationLogPathLength,
  );
}

function normalizeLogText(value) {
  return replaceControlCharacters(value).replace(/\s+/g, " ").trim();
}

function replaceControlCharacters(value) {
  let result = "";

  for (const character of String(value)) {
    const code = character.charCodeAt(0);
    result += code <= 31 || code === 127 ? " " : character;
  }

  return result;
}

function truncateText(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}
