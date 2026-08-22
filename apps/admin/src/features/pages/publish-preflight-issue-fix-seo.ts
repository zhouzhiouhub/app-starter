import type { PublishPreflightIssue } from "./publish-preflight";
import type { PublishPreflightIssueFixer } from "./publish-preflight-issue-fixer";
import { updateSeoField, type SeoField } from "./seo-updates.ts";

const optionalSeoUrlIssuePattern = /^seo\.(canonical|ogImage)$/;

export const seoIssueFixer: PublishPreflightIssueFixer = {
  apply(schema, issue) {
    const seoField = readOptionalSeoUrlIssueField(issue);

    return seoField ? updateSeoField(schema, seoField, "") : null;
  },
  readLabel(issue) {
    return isOptionalSeoUrlIssueCandidate(issue) ? "Clear SEO URL" : null;
  },
};

function readOptionalSeoUrlIssueField(
  issue: PublishPreflightIssue,
): SeoField | null {
  if (!isOptionalSeoUrlIssueCandidate(issue)) {
    return null;
  }

  const match = optionalSeoUrlIssuePattern.exec(issue.field);

  return match?.[1] === "canonical" || match?.[1] === "ogImage"
    ? match[1]
    : null;
}

function isOptionalSeoUrlIssueCandidate(issue: PublishPreflightIssue): boolean {
  return (
    issue.severity === "error" && optionalSeoUrlIssuePattern.test(issue.field)
  );
}
