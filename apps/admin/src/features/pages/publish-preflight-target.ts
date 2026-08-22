import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight-types";

export type PublishPreflightIssueTargetKind =
  | "chrome"
  | "media"
  | "page"
  | "section"
  | "seo";

export interface PublishPreflightIssueTarget {
  kind: PublishPreflightIssueTargetKind;
  label: string;
  sectionId?: string;
}

const sectionFieldPattern = /^sections\[(\d+)\]/;

export function readPublishPreflightIssueTarget(
  issue: PublishPreflightIssue,
  schema: PageSchema,
): PublishPreflightIssueTarget | null {
  const sectionIndex = readSectionIndex(issue.field);

  if (sectionIndex !== null) {
    const section = schema.sections[sectionIndex];

    return section
      ? {
          kind: "section",
          label: `Section ${sectionIndex + 1}: ${formatComponentLabel(
            section.component,
          )}`,
          sectionId: section.id,
        }
      : null;
  }

  if (issue.field.startsWith("seo.")) {
    return { kind: "seo", label: "SEO settings" };
  }

  if (issue.field.startsWith("chrome.")) {
    return { kind: "chrome", label: "Page settings" };
  }

  if (issue.field.startsWith("media.")) {
    return { kind: "media", label: "Preview media" };
  }

  if (issue.field.startsWith("meta.")) {
    return { kind: "page", label: "Page content" };
  }

  return null;
}

function readSectionIndex(field: string): number | null {
  const match = sectionFieldPattern.exec(field);

  if (!match) {
    return null;
  }

  const sectionIndex = Number(match[1]);

  return Number.isInteger(sectionIndex) ? sectionIndex : null;
}

function formatComponentLabel(component: string): string {
  return component.replaceAll("-", " ");
}
