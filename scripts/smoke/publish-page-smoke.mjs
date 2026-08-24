import { randomUUID } from "node:crypto";
import {
  getPublishedPageRevalidationPaths,
  getStorefrontRevalidationCacheTags,
} from "../../packages/schema/dist/index.js";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { createRevalidationSmokeDetails } from "./revalidation-smoke.mjs";

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
    assertRevalidationTargets(revalidation, input);
  }

  if (revalidation?.triggered === true) {
    console.log(
      `Storefront revalidation passed: ${revalidation.paths?.join(", ") ?? "paths unavailable"}`,
    );
  } else {
    console.log("Storefront revalidation skipped by configuration.");
  }
}

function assertRevalidationTargets(revalidation, input) {
  const paths = Array.isArray(revalidation?.paths) ? revalidation.paths : [];
  const tags = Array.isArray(revalidation?.tags) ? revalidation.tags : [];
  const expectedPaths = getPublishedPageRevalidationPaths(input);
  const expectedTags = getStorefrontRevalidationCacheTags(input);
  const missingPaths = expectedPaths.filter((path) => !paths.includes(path));
  const missingTags = expectedTags.filter((tag) => !tags.includes(tag));

  if (missingPaths.length > 0 || missingTags.length > 0) {
    const details = createRevalidationSmokeDetails(revalidation, input);
    const error = new Error(
      [
        "Storefront revalidation did not include the expected page targets",
        `(missing paths: ${formatList(missingPaths)},`,
        `missing tags: ${formatList(missingTags)},`,
        `diagnosis: ${details.diagnosis}).`,
      ].join(" "),
    );
    error.smokeDetails = {
      revalidation: {
        ...details,
        missingPaths,
        missingTags,
      },
    };

    throw error;
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

function formatList(values) {
  return values.length > 0 ? values.join(", ") : "none";
}
