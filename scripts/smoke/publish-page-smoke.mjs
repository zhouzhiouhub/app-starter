import { randomUUID } from "node:crypto";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  assertRevalidationSmokeTargets,
  createRevalidationSmokeDetails,
} from "./revalidation-smoke.mjs";

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
    console.log(
      `Storefront revalidation passed: ${revalidation.paths?.join(", ") ?? "paths unavailable"}`,
    );
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
