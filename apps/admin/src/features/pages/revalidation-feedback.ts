import type { StorefrontRevalidationResult } from "@app-starter/schema";
import { getStorefrontPageUrl } from "./storefront-url";

export function buildPublicationFeedback(input: {
  action: "publish" | "rollback";
  revalidation?: StorefrontRevalidationResult;
  slug: string;
}): string {
  const actionText = input.action === "publish" ? "Published" : "Rolled back";
  const reviewText = `Open ${getStorefrontPageUrl(input.slug)} to review the storefront.`;

  return `${actionText}. ${formatRevalidationStatus(input.revalidation)} ${reviewText}`;
}

function formatRevalidationStatus(
  revalidation: StorefrontRevalidationResult | undefined,
): string {
  if (!revalidation) {
    return "Storefront revalidation status is unavailable.";
  }

  if (revalidation.triggered) {
    return `Storefront revalidation triggered${formatPathCount(
      revalidation.paths.length,
    )}.`;
  }

  if (revalidation.reason === "missing-secret") {
    return "Storefront revalidation was skipped because the secret is not configured.";
  }

  if (revalidation.reason === "missing-url") {
    return "Storefront revalidation was skipped because the URL is not configured.";
  }

  if (revalidation.reason === "request-failed") {
    return `Storefront revalidation failed${formatStatus(
      revalidation.status,
    )}.`;
  }

  return `Storefront revalidation was not triggered${formatReason(
    revalidation.reason,
  )}.`;
}

function formatPathCount(count: number): string {
  if (count <= 0) {
    return "";
  }

  return ` for ${count} ${count === 1 ? "path" : "paths"}`;
}

function formatStatus(status: number | undefined): string {
  return typeof status === "number" ? ` with HTTP ${status}` : "";
}

function formatReason(reason: string | undefined): string {
  return reason ? ` (${reason})` : "";
}
