import type { PageSchema } from "@app-starter/schema";
import {
  readCtaHrefFeedback,
  readCtaLabelFeedback,
} from "./cta-feedback.ts";
import { readImageAltFeedback } from "./image-alt-feedback.ts";
import { readImageSrcFeedback } from "./image-src-feedback.ts";
import type { PublishPreflightIssue } from "./publish-preflight-types.ts";
import { readRichTextFeedback } from "./rich-text-feedback.ts";
import { readSectionText } from "./section-content-updates.ts";
import { readImages } from "./section-list-prop-updates.ts";

interface ImageSrcCheck {
  field: string;
  label: string;
  value: string | undefined;
}

interface ImageAltCheck {
  field: string;
  label: string;
  value: string | undefined;
}

interface CtaPairCheck {
  hrefField: string;
  hrefValue: string | undefined;
  label: string;
  labelField: string;
  labelValue: string | undefined;
}

interface RichTextCheck {
  field: string;
  label: string;
  value: string | undefined;
}

export function collectSectionPreflightIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  const issues: PublishPreflightIssue[] = [];

  schema.sections.forEach((section, sectionIndex) => {
    if (section.component === "image-gallery") {
      readImages(section).forEach((image, imageIndex) => {
        addImageSrcIssue(issues, {
          field: `sections[${sectionIndex}].props.images[${imageIndex}].src`,
          label: `Image gallery image ${imageIndex + 1}`,
          value: image.src,
        });
        addImageAltIssue(issues, {
          field: `sections[${sectionIndex}].props.images[${imageIndex}].alt`,
          label: `Image gallery image ${imageIndex + 1} alt text`,
          value: image.alt,
        });
      });

      return;
    }

    if (section.component === "cta-bar" || section.component === "hero-banner") {
      addCtaPairIssues(issues, {
        hrefField: `sections[${sectionIndex}].props.ctaHref`,
        hrefValue: readSectionText(section.props.ctaHref),
        label: `${section.component} CTA`,
        labelField: `sections[${sectionIndex}].props.ctaLabel`,
        labelValue: readSectionText(section.props.ctaLabel),
      });
    }

    if (section.component === "rich-text") {
      addRichTextIssue(issues, {
        field: `sections[${sectionIndex}].props.content`,
        label: `Rich text section ${sectionIndex + 1}`,
        value: readSectionText(section.props.content),
      });
    }
  });

  return issues;
}

function addCtaPairIssues(
  issues: PublishPreflightIssue[],
  check: CtaPairCheck,
): void {
  const hrefFeedback = readCtaHrefFeedback(check.labelValue, check.hrefValue);
  const labelFeedback = readCtaLabelFeedback(check.labelValue, check.hrefValue);

  if (hrefFeedback.status) {
    issues.push({
      field: check.hrefField,
      message: `${check.label} link: ${hrefFeedback.help ?? "Enter a valid CTA link."}`,
      severity: hrefFeedback.status,
    });
  }

  if (labelFeedback.status) {
    issues.push({
      field: check.labelField,
      message: `${check.label} label: ${labelFeedback.help ?? "Enter a CTA label."}`,
      severity: labelFeedback.status,
    });
  }
}

function addImageSrcIssue(
  issues: PublishPreflightIssue[],
  check: ImageSrcCheck,
): void {
  const feedback = readImageSrcFeedback(check.value);

  if (!feedback.status) {
    return;
  }

  issues.push({
    field: check.field,
    message: `${check.label}: ${feedback.help ?? "Enter a valid image source."}`,
    severity: feedback.status,
  });
}

function addRichTextIssue(
  issues: PublishPreflightIssue[],
  check: RichTextCheck,
): void {
  const feedback = readRichTextFeedback(check.value);

  if (!feedback.status) {
    return;
  }

  issues.push({
    field: check.field,
    message: `${check.label}: ${feedback.help ?? "Review rich text markup."}`,
    severity: feedback.status,
  });
}

function addImageAltIssue(
  issues: PublishPreflightIssue[],
  check: ImageAltCheck,
): void {
  const feedback = readImageAltFeedback(check.value);

  if (!feedback.status) {
    return;
  }

  issues.push({
    field: check.field,
    message: `${check.label}: ${feedback.help ?? "Enter image alt text."}`,
    severity: feedback.status,
  });
}
