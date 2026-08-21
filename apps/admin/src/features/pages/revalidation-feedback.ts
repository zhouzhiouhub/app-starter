import type { StorefrontRevalidationResult } from "@app-starter/schema";
import { getStorefrontPageUrl } from "./storefront-url.ts";
import type { EditorFeedback } from "./types.ts";

export function buildPublicationFeedback(input: {
  action: "publish" | "rollback";
  revalidation?: StorefrontRevalidationResult;
  slug: string;
}): EditorFeedback {
  const actionText = input.action === "publish" ? "Published" : "Rolled back";
  const reviewText = `Open ${getStorefrontPageUrl(input.slug)} to review the storefront.`;
  const revalidationStatus = formatRevalidationStatus(input.revalidation);

  return {
    message: `${actionText}. ${revalidationStatus.message} ${reviewText}`,
    type: revalidationStatus.type,
  };
}

function formatRevalidationStatus(
  revalidation: StorefrontRevalidationResult | undefined,
): EditorFeedback {
  if (!revalidation) {
    return {
      message: "Storefront revalidation status is unavailable.",
      type: "warning",
    };
  }

  if (revalidation.triggered) {
    return {
      message: `Storefront revalidation triggered${formatPathCount(
        revalidation.paths.length,
      )}${formatPathSummary(revalidation.paths)}.`,
      type: "success",
    };
  }

  if (revalidation.reason === "missing-secret") {
    return createWarningStatus(
      "Storefront revalidation was skipped because the secret is not configured.",
      revalidation.paths,
    );
  }

  if (revalidation.reason === "missing-url") {
    return createWarningStatus(
      "Storefront revalidation was skipped because the URL is not configured.",
      revalidation.paths,
    );
  }

  if (revalidation.reason === "request-timeout") {
    return createWarningStatus(
      "Storefront revalidation timed out. Check the Web URL, revalidate route, and STOREFRONT_REVALIDATE_TIMEOUT_MS.",
      revalidation.paths,
    );
  }

  if (revalidation.reason === "request-failed") {
    return createWarningStatus(
      formatRequestFailedRevalidation(revalidation.status),
      revalidation.paths,
    );
  }

  return createWarningStatus(
    `Storefront revalidation was not triggered${formatReason(
      revalidation.reason,
    )}.`,
    revalidation.paths,
  );
}

function createWarningStatus(message: string, paths: string[]): EditorFeedback {
  return {
    message: `${message}${formatPathCheck(paths)}`,
    type: "warning",
  };
}

function formatPathCount(count: number): string {
  if (count <= 0) {
    return "";
  }

  return ` for ${count} ${count === 1 ? "path" : "paths"}`;
}

function formatPathSummary(paths: string[]): string {
  const summary = formatPathList(paths);
  return summary ? `: ${summary}` : "";
}

function formatPathCheck(paths: string[]): string {
  const summary = formatPathList(paths);
  return summary ? ` Check affected paths: ${summary}.` : "";
}

function formatPathList(paths: string[]): string {
  const visible = paths.slice(0, 3);
  const suffix =
    paths.length > visible.length ? `, and ${paths.length - visible.length} more` : "";

  return `${visible.join(", ")}${suffix}`;
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
