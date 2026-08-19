import { adminRequest } from "../auth/api";
import { readApiErrorMessage } from "../../lib/api-error";
import type { SiteSettings, UpdateSiteSettingsInput } from "./types";

export async function getSiteSettings(): Promise<SiteSettings> {
  const result = await readAdminJson<{ data?: SiteSettings }>(
    "/sites/current",
    {},
    "Site settings could not be loaded.",
  );

  if (!result.data?.id) {
    throw new Error("Site settings could not be loaded.");
  }

  return result.data;
}

export async function updateSiteSettings(
  input: UpdateSiteSettingsInput,
): Promise<SiteSettings> {
  const result = await readAdminJson<{ data?: SiteSettings }>(
    "/sites/current",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
    "Site settings could not be saved.",
  );

  if (!result.data?.id) {
    throw new Error("Site settings could not be saved.");
  }

  return result.data;
}

async function readAdminJson<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await adminRequest(path, init);
  const result = (await response.json()) as T & { error?: unknown };

  if (!response.ok) {
    throw new Error(readApiErrorMessage(result, fallback));
  }

  return result;
}
