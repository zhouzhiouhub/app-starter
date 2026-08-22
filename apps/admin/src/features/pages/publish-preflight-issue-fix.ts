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
const ctaPairIssuePattern = /^sections\[(\d+)\]\.props\.(ctaHref|ctaLabel)$/;

export function readPublishPreflightIssueFixLabel(
  issue: PublishPreflightIssue,
): string | null {
  const viewport = readSectionOrderIssueViewport(issue);

  if (viewport) {
    return `Normalize ${viewport} order`;
  }

  if (isCtaPairIssueCandidate(issue)) {
    return "Clear CTA fields";
  }

  return isRichTextContentIssueCandidate(issue) ? "Sanitize rich text" : null;
}

export function applyPublishPreflightIssueFix(
  schema: PageSchema,
  issue: PublishPreflightIssue,
): PageSchema | null {
  const viewport = readSectionOrderIssueViewport(issue);
  const ctaSectionId = readIncompleteCtaIssueSectionId(issue, schema);
  const richTextSectionId = readRichTextContentIssueSectionId(issue, schema);

  if (viewport) {
    return normalizeSectionOrder(schema, viewport);
  }

  if (ctaSectionId) {
    return clearCtaFields(schema, ctaSectionId);
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

function readIncompleteCtaIssueSectionId(
  issue: PublishPreflightIssue,
  schema: PageSchema,
): string | null {
  if (!isCtaPairIssueCandidate(issue)) {
    return null;
  }

  const match = ctaPairIssuePattern.exec(issue.field);
  const sectionIndex = match?.[1] ? Number.parseInt(match[1], 10) : -1;
  const section = schema.sections[sectionIndex];

  if (
    section?.component !== "cta-bar" &&
    section?.component !== "hero-banner"
  ) {
    return null;
  }

  const hasCtaHref = Boolean(readSectionText(section.props.ctaHref).trim());
  const hasCtaLabel = Boolean(readSectionText(section.props.ctaLabel).trim());

  return hasCtaHref !== hasCtaLabel ? section.id : null;
}

function clearCtaFields(schema: PageSchema, sectionId: string): PageSchema {
  const withoutLabel = updateSectionTextField(
    schema,
    sectionId,
    "ctaLabel",
    "",
    "plain",
  );

  return updateSectionTextField(
    withoutLabel,
    sectionId,
    "ctaHref",
    "",
    "plain",
  );
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

function isCtaPairIssueCandidate(issue: PublishPreflightIssue): boolean {
  return issue.severity === "warning" && ctaPairIssuePattern.test(issue.field);
}
