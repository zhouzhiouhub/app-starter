import type { SectionNode, Viewport } from "@app-starter/schema";

export type SectionTemplateId =
  | "cta-bar"
  | "faq"
  | "hero-banner"
  | "image-gallery"
  | "rich-text"
  | "spec-table";

export function createSection(
  templateId: SectionTemplateId,
  sectionId: string,
  currentSections: SectionNode[],
): SectionNode {
  const layout = createDefaultLayout(currentSections, templateId);

  switch (templateId) {
    case "cta-bar":
      return {
        id: sectionId,
        component: "cta-bar",
        layout,
        props: {
          ctaHref: "/en/contact",
          ctaLabel: "Start now",
          title: { defaultValue: "Ready to launch?" },
        },
        visibility: { desktop: true, mobile: true },
      };
    case "faq":
      return {
        id: sectionId,
        component: "faq",
        layout,
        props: {
          items: [
            {
              answer: "Use the section properties panel to customize this answer.",
              question: "What can visitors learn here?",
            },
          ],
        },
        visibility: { desktop: true, mobile: true },
      };
    case "hero-banner":
      return {
        id: sectionId,
        component: "hero-banner",
        layout,
        props: {
          body: { defaultValue: "Describe the offer and key benefit." },
          ctaHref: "/en",
          ctaLabel: "Preview",
          eyebrow: "New section",
          title: { defaultValue: "Build a clear storefront story" },
        },
        visibility: { desktop: true, mobile: true },
      };
    case "image-gallery":
      return {
        id: sectionId,
        component: "image-gallery",
        layout,
        props: {
          images: [],
        },
        visibility: { desktop: true, mobile: true },
      };
    case "spec-table":
      return {
        id: sectionId,
        component: "spec-table",
        layout,
        props: {
          rows: [
            {
              label: "Material",
              value: "Update this value in the section properties panel.",
            },
          ],
        },
        visibility: { desktop: true, mobile: true },
      };
    case "rich-text":
      return {
        id: sectionId,
        component: "rich-text",
        layout,
        props: {
          content: { defaultValue: "Add supporting copy for this page." },
          title: { defaultValue: "Section heading" },
        },
        visibility: { desktop: true, mobile: true },
      };
  }
}

function createDefaultLayout(
  sections: SectionNode[],
  templateId: SectionTemplateId,
) {
  return {
    desktop: createViewportLayout(sections, templateId, "desktop"),
    mobile: createViewportLayout(sections, templateId, "mobile"),
  };
}

function createViewportLayout(
  sections: SectionNode[],
  templateId: SectionTemplateId,
  viewport: Viewport,
) {
  const width = viewport === "desktop" ? 1200 : 390;
  const height = defaultSectionHeight(templateId, viewport);

  return {
    height,
    width,
    x: 0,
    y: nextSectionY(sections, viewport),
  };
}

function defaultSectionHeight(
  templateId: SectionTemplateId,
  viewport: Viewport,
): number {
  const heights: Record<SectionTemplateId, { desktop: number; mobile: number }> = {
    "cta-bar": { desktop: 180, mobile: 220 },
    faq: { desktop: 360, mobile: 420 },
    "hero-banner": { desktop: 560, mobile: 620 },
    "image-gallery": { desktop: 360, mobile: 420 },
    "rich-text": { desktop: 320, mobile: 360 },
    "spec-table": { desktop: 360, mobile: 420 },
  };

  return heights[templateId][viewport];
}

function nextSectionY(sections: SectionNode[], viewport: Viewport): number {
  return sections.reduce((max, section) => {
    const layout = section.layout[viewport];

    if (!layout) {
      return max;
    }

    return Math.max(max, layout.y + (layout.height ?? 320));
  }, 0);
}
