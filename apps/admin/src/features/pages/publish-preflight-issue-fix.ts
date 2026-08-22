import type { PageSchema, Viewport } from "@app-starter/schema";
import { sanitizeRichText } from "@app-starter/ui";
import type { PublishPreflightIssue } from "./publish-preflight";
import {
  readSectionText,
  updateSectionTextField,
} from "./section-content-updates.ts";
import { normalizeSectionOrder } from "./section-order-updates.ts";

const sectionOrderIssuePattern = /^layout\.(desktop|mobile)\.sectionOrder$/;
const richTextContentIssuePattern = /^sections\[(\d+)\]\.props\.content$/;

export function readPublishPreflightIssueFixLabel(
  issue: PublishPreflightIssue,
): string | null {
  const viewport = readSectionOrderIssueViewport(issue);

  if (viewport) {
    return `Normalize ${viewport} order`;
  }

  return isRichTextContentIssueCandidate(issue) ? "Sanitize rich text" : null;
}

export function applyPublishPreflightIssueFix(
  schema: PageSchema,
  issue: PublishPreflightIssue,
): PageSchema | null {
  const viewport = readSectionOrderIssueViewport(issue);
  const richTextSectionId = readRichTextContentIssueSectionId(issue, schema);

  if (viewport) {
    return normalizeSectionOrder(schema, viewport);
  }

  if (richTextSectionId) {
    return sanitizeRichTextContent(schema, richTextSectionId);
  }

  return null;
}

function readSectionOrderIssueViewport(
  issue: PublishPreflightIssue,
): Viewport | null {
  const match = sectionOrderIssuePattern.exec(issue.field);

  return match?.[1] === "desktop" || match?.[1] === "mobile"
    ? match[1]
    : null;
}

function readRichTextContentIssueSectionId(
  issue: PublishPreflightIssue,
  schema: PageSchema,
): string | null {
  if (!isRichTextContentIssueCandidate(issue)) {
    return null;
  }

  const match = richTextContentIssuePattern.exec(issue.field);
  const sectionIndex = match?.[1] ? Number.parseInt(match[1], 10) : -1;
  const section = schema.sections[sectionIndex];

  return section?.component === "rich-text" ? section.id : null;
}

function sanitizeRichTextContent(
  schema: PageSchema,
  sectionId: string,
): PageSchema {
  const section = schema.sections.find((item) => item.id === sectionId);
  const sanitized = sanitizeRichText(readSectionText(section?.props.content));

  return updateSectionTextField(
    schema,
    sectionId,
    "content",
    sanitized,
    "i18n",
  );
}

function isRichTextContentIssueCandidate(issue: PublishPreflightIssue): boolean {
  return (
    issue.severity === "warning" && richTextContentIssuePattern.test(issue.field)
  );
}
