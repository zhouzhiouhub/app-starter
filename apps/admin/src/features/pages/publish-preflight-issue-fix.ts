import type { PageSchema, Viewport } from "@app-starter/schema";
import { sanitizeRichText } from "@app-starter/ui";
import type { PublishPreflightIssue } from "./publish-preflight";
import {
  readSectionText,
  updateSectionTextField,
} from "./section-content-updates.ts";
import { readImages, removeImage } from "./section-list-prop-updates.ts";
import { normalizeSectionOrder } from "./section-order-updates.ts";
import { updateSeoField, type SeoField } from "./seo-updates.ts";

const sectionOrderIssuePattern = /^layout\.(desktop|mobile)\.sectionOrder$/;
const richTextContentIssuePattern = /^sections\[(\d+)\]\.props\.content$/;
const ctaPairIssuePattern = /^sections\[(\d+)\]\.props\.(ctaHref|ctaLabel)$/;
const blankImageSrcIssuePattern =
  /^sections\[(\d+)\]\.props\.images\[(\d+)\]\.src$/;
const optionalSeoUrlIssuePattern = /^seo\.(canonical|ogImage)$/;
const localeHrefIssuePattern =
  /^chrome\.header\.content\.localeSwitcher\.locales\[(\d+)\]\.href$/;

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

  if (isBlankImageSrcIssueCandidate(issue)) {
    return "Remove blank image";
  }

  if (isOptionalSeoUrlIssueCandidate(issue)) {
    return "Clear SEO URL";
  }

  if (isLocaleHrefIssueCandidate(issue)) {
    return "Clear locale link";
  }

  return isRichTextContentIssueCandidate(issue) ? "Sanitize rich text" : null;
}

export function applyPublishPreflightIssueFix(
  schema: PageSchema,
  issue: PublishPreflightIssue,
): PageSchema | null {
  const viewport = readSectionOrderIssueViewport(issue);
  const ctaSectionId = readIncompleteCtaIssueSectionId(issue, schema);
  const blankImageTarget = readBlankImageSrcIssueTarget(issue, schema);
  const seoField = readOptionalSeoUrlIssueField(issue);
  const localeHrefIndex = readLocaleHrefIssueIndex(issue, schema);
  const richTextSectionId = readRichTextContentIssueSectionId(issue, schema);

  if (viewport) {
    return normalizeSectionOrder(schema, viewport);
  }

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

  if (seoField) {
    return updateSeoField(schema, seoField, "");
  }

  if (localeHrefIndex !== null) {
    return clearLocaleHref(schema, localeHrefIndex);
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

function clearLocaleHref(schema: PageSchema, localeIndex: number): PageSchema {
  const headerContent = schema.chrome.header.content;

  return {
    ...schema,
    chrome: {
      ...schema.chrome,
      header: {
        ...schema.chrome.header,
        content: {
          ...headerContent,
          localeSwitcher: {
            ...headerContent.localeSwitcher,
            locales: headerContent.localeSwitcher.locales.map(
              (locale, index) =>
                index === localeIndex
                  ? {
                      code: locale.code,
                      label: locale.label,
                    }
                  : locale,
            ),
          },
        },
      },
    },
  };
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

function isOptionalSeoUrlIssueCandidate(issue: PublishPreflightIssue): boolean {
  return (
    issue.severity === "error" && optionalSeoUrlIssuePattern.test(issue.field)
  );
}

function isLocaleHrefIssueCandidate(issue: PublishPreflightIssue): boolean {
  return issue.severity === "error" && localeHrefIssuePattern.test(issue.field);
}
