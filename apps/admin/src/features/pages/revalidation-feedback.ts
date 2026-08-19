import type { StorefrontRevalidationResult } from "@app-starter/schema";
import { getStorefrontPageUrl } from "./storefront-url.ts";

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

  if (revalidation.reason === "request-timeout") {
    return "Storefront revalidation timed out. Check the Web URL, revalidate route, and STOREFRONT_REVALIDATE_TIMEOUT_MS.";
  }

  if (revalidation.reason === "request-failed") {
    return formatRequestFailedRevalidation(revalidation.status);
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

function formatRequestFailedRevalidation(status: number | undefined): string {
  if (status === 400) {
    return "Storefront revalidation rejected the page payload with HTTP 400. Check the page slug, locale, and market.";
  }

  if (status === 401 || status === 403) {
    return `Storefront revalidation failed${formatStatus(
      status,
    )}. Check that API and Web use the same STOREFRONT_REVALIDATE_SECRET.`;
  }

  if (status === 404) {
    return "Storefront revalidation route was not found with HTTP 404. Check STOREFRONT_REVALIDATE_URL or WEB_URL.";
  }

  if (status === 503) {
    return "Storefront revalidation route is not configured on Web with HTTP 503. Check STOREFRONT_REVALIDATE_SECRET on the Web service.";
  }

  if (typeof status === "number") {
    return `Storefront revalidation failed${formatStatus(
      status,
    )}. Check the Web revalidate route and secret configuration.`;
  }

  return "Storefront revalidation request failed or timed out. Check the Web URL, revalidate route, and STOREFRONT_REVALIDATE_TIMEOUT_MS.";
}

function formatReason(reason: string | undefined): string {
  return reason ? ` (${reason})` : "";
}
