import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  formatMediaListFilterDiagnostic,
  isMediaListResponseContainingAsset,
  readMediaListFilterDiagnostic,
} from "./media-smoke-diagnostics.mjs";

export async function assertMediaListFilters(input, accessToken, asset) {
  const query = new URLSearchParams({
    limit: "20",
    page: "1",
    status: "active",
    type: "image",
  });
  const response = await fetchJson(`${input.apiBaseUrl}/media?${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Media list filter check failed."));
  }

  if (!isMediaListResponseContainingAsset(response.body, asset)) {
    const diagnostic = readMediaListFilterDiagnostic(response.body, asset);

    throw new Error(
      `Media list filter check did not return the confirmed image asset (${formatMediaListFilterDiagnostic(
        diagnostic,
      )}).`,
    );
  }
}
