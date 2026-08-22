import type { PageSchema } from "@app-starter/schema";
import { sanitizeRichText } from "@app-starter/ui";
import type { PublishPreflightIssue } from "./publish-preflight";
import type { PublishPreflightIssueFixer } from "./publish-preflight-issue-fixer";
import {
  readSectionText,
  updateSectionTextField,
} from "./section-content-updates.ts";
import { readImages, removeImage } from "./section-list-prop-updates.ts";

const richTextContentIssuePattern = /^sections\[(\d+)\]\.props\.content$/;
const ctaPairIssuePattern = /^sections\[(\d+)\]\.props\.(ctaHref|ctaLabel)$/;
const blankImageSrcIssuePattern =
  /^sections\[(\d+)\]\.props\.images\[(\d+)\]\.src$/;

export const sectionIssueFixer: PublishPreflightIssueFixer = {
  apply(schema, issue) {
    const ctaSectionId = readIncompleteCtaIssueSectionId(issue, schema);
    const blankImageTarget = readBlankImageSrcIssueTarget(issue, schema);
    const richTextSectionId = readRichTextContentIssueSectionId(issue, schema);

    if (ctaSectionId) {
      return clearCtaFields(schema, ctaSectionId);
    }

    if (blankImageTarget) {
      return removeImage(
        schema,
        blankImageTarget.sectionId,
        blankImageTarget.imageIndex,
      );
    }

    return richTextSectionId
      ? sanitizeRichTextContent(schema, richTextSectionId)
      : null;
  },
  readLabel(issue) {
    if (isCtaPairIssueCandidate(issue)) {
      return "Clear CTA fields";
    }

    if (isBlankImageSrcIssueCandidate(issue)) {
      return "Remove blank image";
    }

    return isRichTextContentIssueCandidate(issue) ? "Sanitize rich text" : null;
  },
};

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

function readBlankImageSrcIssueTarget(
  issue: PublishPreflightIssue,
  schema: PageSchema,
): { imageIndex: number; sectionId: string } | null {
  if (!isBlankImageSrcIssueCandidate(issue)) {
    return null;
  }

  const match = blankImageSrcIssuePattern.exec(issue.field);
  const sectionIndex = match?.[1] ? Number.parseInt(match[1], 10) : -1;
  const imageIndex = match?.[2] ? Number.parseInt(match[2], 10) : -1;
  const section = schema.sections[sectionIndex];

  if (section?.component !== "image-gallery") {
    return null;
  }

  const image = readImages(section)[imageIndex];

  return image && !image.src.trim()
    ? { imageIndex, sectionId: section.id }
    : null;
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

function isBlankImageSrcIssueCandidate(issue: PublishPreflightIssue): boolean {
  return (
    issue.severity === "warning" && blankImageSrcIssuePattern.test(issue.field)
  );
}
