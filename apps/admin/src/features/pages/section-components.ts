export const supportedSectionComponentIds = [
  "hero-banner",
  "rich-text",
  "cta-bar",
  "faq",
  "image-gallery",
  "spec-table",
] as const;

export type SectionTemplateId = (typeof supportedSectionComponentIds)[number];

const supportedSectionComponentIdSet = new Set<string>(
  supportedSectionComponentIds,
);

export function isSupportedSectionComponent(
  component: string,
): component is SectionTemplateId {
  return supportedSectionComponentIdSet.has(component);
}
