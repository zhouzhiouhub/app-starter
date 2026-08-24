import { isProductionHttpUrl } from "@app-starter/schema";
import { hasSensitiveMediaUrlQueryParameters } from "./media-url-sensitive-parameters.ts";

export function readExternalMediaUrlError(
  value: string | undefined,
): string | null {
  const url = value?.trim() ?? "";

  if (!url) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return "Enter a valid media URL.";
  }

  if (parsed.protocol !== "https:") {
    return "Use an https media URL.";
  }

  if (parsed.username || parsed.password) {
    return "Media URL must not include username or password.";
  }

  if (parsed.hash) {
    return "Media URL must not include fragments.";
  }

  if (hasSensitiveMediaUrlQueryParameters(parsed)) {
    return "Media URL must not include credential or token query parameters.";
  }

  if (!isProductionHttpUrl(parsed)) {
    return "Use a public production media URL.";
  }

  return null;
}
