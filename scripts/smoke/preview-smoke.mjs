import { randomUUID } from "node:crypto";
import { hasNoIndexRobots, joinUrl } from "./storefront-smoke.mjs";

export async function assertPreviewFlow(input, accessToken, schema, title) {
  const page = await ensureSmokePage(input, accessToken, title);

  await saveDraft(input, accessToken, page.id, schema, title);
  const preview = await createPreviewToken(input, accessToken, page.id);
  await assertPublicPreview(input, preview.token, title);
  await assertWebPreview(input, preview.token, title);

  return page;
}

export function getPreviewPath(token) {
  const params = new URLSearchParams({ token });
  return `/preview?${params.toString()}`;
}

export function isPreviewTokenShape(value, slug) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.token === "string" &&
    value.token.includes(".") &&
    typeof value.expiresAt === "string" &&
    !Number.isNaN(Date.parse(value.expiresAt)) &&
    value.slug === slug
  );
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

async function ensureSmokePage(input, accessToken, title) {
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

async function saveDraft(input, accessToken, pageId, schema, title) {
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

async function createPreviewToken(input, accessToken, pageId) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/preview-token`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Preview token request failed."));
  }

  const preview = response.body?.data;

  if (!isPreviewTokenShape(preview, input.slug)) {
    throw new Error("Preview token response did not include a valid token.");
  }

  console.log("Preview token API passed.");
  return preview;
}

async function assertPublicPreview(input, token, title) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/public/preview/${encodeURIComponent(token)}`,
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

async function assertWebPreview(input, token, title) {
  const url = joinUrl(input.webUrl, getPreviewPath(token));
  let lastError = "";

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetchText(url);
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

function isPageSummary(value, slug) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.slug === slug
  );
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

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text,
    url,
  };
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON content: ${text.slice(0, 160)}`);
  }
}

function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return `${fallback} ${response.status}: ${message}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readBodySnippet(text) {
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
  return snippet || null;
}

function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
