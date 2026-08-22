import { randomUUID } from "node:crypto";
import { fetchJson, readHttpError } from "./preview-smoke-http.mjs";

export async function createPreviewToken(input, accessToken, pageId) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/preview-token`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Idempotency-Key": randomUUID(),
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
