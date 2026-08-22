import type { PageSchema, Viewport } from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight";
import { normalizeSectionOrder } from "./section-order-updates.ts";

const sectionOrderIssuePattern = /^layout\.(desktop|mobile)\.sectionOrder$/;

export function readPublishPreflightIssueFixLabel(
  issue: PublishPreflightIssue,
): string | null {
  const viewport = readSectionOrderIssueViewport(issue);

  return viewport ? `Normalize ${viewport} order` : null;
}

export function applyPublishPreflightIssueFix(
  schema: PageSchema,
  issue: PublishPreflightIssue,
): PageSchema | null {
  const viewport = readSectionOrderIssueViewport(issue);

  return viewport ? normalizeSectionOrder(schema, viewport) : null;
}

function readSectionOrderIssueViewport(
  issue: PublishPreflightIssue,
): Viewport | null {
  const match = sectionOrderIssuePattern.exec(issue.field);

  return match?.[1] === "desktop" || match?.[1] === "mobile"
    ? match[1]
    : null;
}
