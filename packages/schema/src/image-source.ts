import type { SectionNode } from "./foundation.js";
import type { PageSchema } from "./page-schema.js";
import { mediaAssetReferenceSchema } from "./media-reference.js";

export type PublishableImageSrcIssueReason =
  | "http_requires_https"
  | "invalid_image_source";

export interface PublishableImageSrcIssue {
  field: string;
  reason: PublishableImageSrcIssueReason;
}

const unsafeImageSrcCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);

export function isPublishableImageSrc(value: string): boolean {
  const src = value.trim();

  if (!src || hasUnsafeImageSrcCharacter(src)) {
    return false;
  }

  if (mediaAssetReferenceSchema.safeParse(src).success) {
    return true;
  }

  if (src.startsWith("/")) {
    return !src.startsWith("//");
  }

  if (src.startsWith("https://")) {
    try {
      const parsed = new URL(src);

      return (
        parsed.protocol === "https:" &&
        Boolean(parsed.hostname) &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }

  return false;
}

export function collectPublishableImageSrcIssues(
  schema: PageSchema,
): PublishableImageSrcIssue[] {
  const issues: PublishableImageSrcIssue[] = [];

  addImageSrcIssue(issues, "seo.ogImage", schema.seo.ogImage);

  schema.sections.forEach((section, sectionIndex) => {
    if (section.component !== "image-gallery") {
      return;
    }

    readImageGallerySources(section).forEach((src, imageIndex) => {
      addImageSrcIssue(
        issues,
        `sections[${sectionIndex}].props.images[${imageIndex}].src`,
        src,
      );
    });
  });

  return issues;
}

function readImageGallerySources(section: SectionNode): unknown[] {
  const images = section.props.images;

  if (!Array.isArray(images)) {
    return [];
  }

  return images.map((image) =>
    image && typeof image === "object"
      ? (image as Record<string, unknown>).src
      : undefined,
  );
}

function addImageSrcIssue(
  issues: PublishableImageSrcIssue[],
  field: string,
  value: unknown,
): void {
  if (typeof value !== "string") {
    if (value !== undefined) {
      issues.push({ field, reason: "invalid_image_source" });
    }

    return;
  }

  const src = value.trim();

  if (!src || isPublishableImageSrc(src)) {
    return;
  }

  issues.push({
    field,
    reason: src.startsWith("http://")
      ? "http_requires_https"
      : "invalid_image_source",
  });
}

function hasUnsafeImageSrcCharacter(src: string): boolean {
  return Array.from(src).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return (
      codePoint <= 0x20 ||
      codePoint === 0x7f ||
      unsafeImageSrcCharacters.has(character)
    );
  });
}
