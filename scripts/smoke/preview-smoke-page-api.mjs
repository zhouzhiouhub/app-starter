import { randomUUID } from "node:crypto";
import { fetchJson, readHttpError } from "./preview-smoke-http.mjs";

export async function ensureSmokePage(input, accessToken, title) {
  const existing = await findPageBySlug(input, accessToken);

  if (existing) {
    console.log("Page editor lookup passed.");
    return existing;
  }

  const response = await fetchJson(`${input.apiBaseUrl}/pages`, {
    body: JSON.stringify({
      slug: input.slug,
      title,
      type: "landing",
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Page create request failed."));
  }

  if (!isPageSummary(response.body?.data, input.slug)) {
    throw new Error("Page create response did not include the expected page.");
  }

  console.log("Page create passed.");
  return response.body.data;
}

export async function saveDraft(input, accessToken, pageId, schema, title) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/schema`,
    {
      body: JSON.stringify(schema),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      method: "PUT",
    },
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Draft save request failed."));
  }

  if (response.body?.data?.title !== title) {
    throw new Error("Draft save response did not include the expected title.");
  }

  console.log("Draft save passed.");
}

async function findPageBySlug(input, accessToken) {
  const response = await fetchJson(`${input.apiBaseUrl}/pages?limit=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Page list request failed."));
  }

  const pages = Array.isArray(response.body?.data) ? response.body.data : [];
  return pages.find((page) => isPageSummary(page, input.slug)) ?? null;
}

function isPageSummary(value, slug) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.slug === slug
  );
}
