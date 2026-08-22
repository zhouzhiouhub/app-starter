import { randomUUID } from "node:crypto";
import { createRevalidationSmokeDetails } from "./revalidation-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function assertRollbackFlow(input, accessToken, options) {
  const firstPublishedVersionId = await readPublishedVersionId(
    input,
    accessToken,
    options.pageId,
  );
  const rollbackCandidateTitle = `${options.title} rollback candidate`;
  const rollbackCandidateSchema = buildSmokePageSchema({
    locale: input.locale,
    market: input.market,
    slug: input.slug,
    title: rollbackCandidateTitle,
  });

  await publishRollbackCandidate(
    input,
    accessToken,
    options.pageId,
    rollbackCandidateSchema,
    rollbackCandidateTitle,
  );
  const rollback = await rollbackPage(
    input,
    accessToken,
    options.pageId,
    firstPublishedVersionId,
    options.title,
  );
  const current = await readPageDetail(input, accessToken, options.pageId);
  const rollbackVersionId = readPublishedVersionIdFromDetail(current);

  if (!rollbackVersionId) {
    throw new Error("Rollback did not leave a published version.");
  }

  if (rollbackVersionId === firstPublishedVersionId) {
    throw new Error("Rollback did not create a new published version.");
  }

  console.log("Rollback API passed.");

  return {
    revalidation: createRevalidationSmokeDetails(
      rollback?.meta?.revalidation,
      input,
    ),
    rollbackVersionId,
    targetVersionId: firstPublishedVersionId,
    title: rollback?.data?.meta?.title,
  };
}

export function readPublishedVersionIdFromDetail(detail) {
  const versionId = detail?.data?.publishedVersionId;

  return typeof versionId === "string" && versionId ? versionId : null;
}

export function isRollbackResponse(response, input, title) {
  const schema = response?.data;

  return schema?.meta?.slug === input.slug && schema?.meta?.title === title;
}

async function readPublishedVersionId(input, accessToken, pageId) {
  const detail = await readPageDetail(input, accessToken, pageId);
  const versionId = readPublishedVersionIdFromDetail(detail);

  if (!versionId) {
    throw new Error(
      "Page detail did not include a published version to roll back to.",
    );
  }

  return versionId;
}

async function publishRollbackCandidate(
  input,
  accessToken,
  pageId,
  schema,
  title,
) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/publish`,
    {
      body: JSON.stringify(schema),
      headers: writeHeaders(accessToken),
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(
      readHttpError(response, "Rollback candidate publish failed."),
    );
  }

  if (!isRollbackResponse(response.body, input, title)) {
    throw new Error(
      "Rollback candidate publish returned an unexpected schema.",
    );
  }
}

async function rollbackPage(input, accessToken, pageId, versionId, title) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/rollback`,
    {
      body: JSON.stringify({ versionId }),
      headers: writeHeaders(accessToken),
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Rollback request failed."));
  }

  if (!isRollbackResponse(response.body, input, title)) {
    throw new Error("Rollback response did not restore the expected schema.");
  }

  assertRollbackRevalidation(response.body?.meta?.revalidation, input);

  return response.body;
}

async function readPageDetail(input, accessToken, pageId) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Page detail request failed."));
  }

  return response.body;
}

function writeHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Idempotency-Key": randomUUID(),
  };
}

function assertRollbackRevalidation(revalidation, input) {
  if (input.requireRevalidation && revalidation?.triggered !== true) {
    throw createRollbackRevalidationFailure(revalidation, input);
  }
}

export function createRollbackRevalidationFailure(revalidation, input) {
  const details = createRevalidationSmokeDetails(revalidation, input);
  const error = new Error(formatRollbackRevalidationDetails(details));
  error.smokeDetails = { revalidation: details };

  return error;
}

export function formatRollbackRevalidationFailure(revalidation, input) {
  const details = createRevalidationSmokeDetails(revalidation, input);

  return formatRollbackRevalidationDetails(details);
}

function formatRollbackRevalidationDetails(details) {
  return `Rollback revalidation was not triggered (diagnosis: ${details.diagnosis}, reason: ${details.reason ?? "unknown"}, status: ${details.status ?? "none"}, paths: ${details.pathCount}, tags: ${details.tagCount}).`;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? parseJson(text, url) : null;

  return {
    body,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url,
  };
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      redactSmokeSecrets(
        `${url} returned non-JSON content: ${text.slice(0, 160)}`,
      ),
    );
  }
}

function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return redactSmokeSecrets(`${fallback} ${response.status}: ${message}`);
}
