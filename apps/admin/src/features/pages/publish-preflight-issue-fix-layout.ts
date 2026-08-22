import type { Viewport } from "@app-starter/schema";
import { normalizeSectionOrder } from "./section-order-updates.ts";
import type { PublishPreflightIssueFixer } from "./publish-preflight-issue-fixer";
import type { PublishPreflightIssue } from "./publish-preflight";

const sectionOrderIssuePattern = /^layout\.(desktop|mobile)\.sectionOrder$/;

export const layoutIssueFixer: PublishPreflightIssueFixer = {
  apply(schema, issue) {
    const viewport = readSectionOrderIssueViewport(issue);

    return viewport ? normalizeSectionOrder(schema, viewport) : null;
  },
  readLabel(issue) {
    const viewport = readSectionOrderIssueViewport(issue);

    return viewport ? `Normalize ${viewport} order` : null;
  },
};

function readSectionOrderIssueViewport(
  issue: PublishPreflightIssue,
): Viewport | null {
  const match = sectionOrderIssuePattern.exec(issue.field);

  return match?.[1] === "desktop" || match?.[1] === "mobile"
    ? match[1]
    : null;
}
