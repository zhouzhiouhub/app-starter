import type { PageSchema } from "@app-starter/schema";
import { updateHeaderLocaleOption } from "./chrome-header-updates.ts";
import type { PublishPreflightIssue } from "./publish-preflight";
import type { PublishPreflightIssueFixer } from "./publish-preflight-issue-fixer";

const localeHrefIssuePattern =
  /^chrome\.header\.content\.localeSwitcher\.locales\[(\d+)\]\.href$/;

export const chromeIssueFixer: PublishPreflightIssueFixer = {
  apply(schema, issue) {
    const localeHrefIndex = readLocaleHrefIssueIndex(issue, schema);

    return localeHrefIndex !== null
      ? updateHeaderLocaleOption(schema, localeHrefIndex, "href", "")
      : null;
  },
  readLabel(issue) {
    return isLocaleHrefIssueCandidate(issue) ? "Clear locale link" : null;
  },
};

function readLocaleHrefIssueIndex(
  issue: PublishPreflightIssue,
  schema: PageSchema,
): number | null {
  if (!isLocaleHrefIssueCandidate(issue)) {
    return null;
  }

  const match = localeHrefIssuePattern.exec(issue.field);
  const localeIndex = match?.[1] ? Number.parseInt(match[1], 10) : -1;
  const locale =
    schema.chrome.header.content.localeSwitcher.locales[localeIndex];

  return locale?.href?.trim() ? localeIndex : null;
}

function isLocaleHrefIssueCandidate(issue: PublishPreflightIssue): boolean {
  return issue.severity === "error" && localeHrefIssuePattern.test(issue.field);
}
