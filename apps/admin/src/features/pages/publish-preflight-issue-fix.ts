import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight";
import { chromeIssueFixer } from "./publish-preflight-issue-fix-chrome.ts";
import { layoutIssueFixer } from "./publish-preflight-issue-fix-layout.ts";
import { sectionIssueFixer } from "./publish-preflight-issue-fix-section.ts";
import { seoIssueFixer } from "./publish-preflight-issue-fix-seo.ts";
import type { PublishPreflightIssueFixer } from "./publish-preflight-issue-fixer";

const issueFixers: PublishPreflightIssueFixer[] = [
  layoutIssueFixer,
  sectionIssueFixer,
  seoIssueFixer,
  chromeIssueFixer,
];

export function readPublishPreflightIssueFixLabel(
  issue: PublishPreflightIssue,
): string | null {
  return readFirstFixerResult(issueFixers, (fixer) => fixer.readLabel(issue));
}

export function applyPublishPreflightIssueFix(
  schema: PageSchema,
  issue: PublishPreflightIssue,
): PageSchema | null {
  return readFirstFixerResult(issueFixers, (fixer) =>
    fixer.apply(schema, issue),
  );
}

function readFirstFixerResult<TResult>(
  fixers: PublishPreflightIssueFixer[],
  reader: (fixer: PublishPreflightIssueFixer) => TResult | null,
): TResult | null {
  for (const fixer of fixers) {
    const result = reader(fixer);

    if (result !== null) {
      return result;
    }
  }

  return null;
}
