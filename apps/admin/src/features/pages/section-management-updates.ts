import {
  getOrderedSectionsForViewport,
  setSectionOrderForViewport,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";

export type SectionTemplateId =
  | "cta-bar"
  | "faq"
  | "hero-banner"
  | "image-gallery"
  | "rich-text"
  | "spec-table";

export const sectionTemplateOptions: Array<{
  description: string;
  label: string;
  value: SectionTemplateId;
}> = [
  {
    description: "Large campaign header.",
    label: "Hero",
    value: "hero-banner",
  },
  {
    description: "Editorial text block.",
    label: "Rich text",
    value: "rich-text",
  },
  {
    description: "Conversion callout.",
    label: "CTA",
    value: "cta-bar",
  },
  {
    description: "Question and answer list.",
    label: "FAQ",
    value: "faq",
  },
  {
    description: "Image grid.",
    label: "Image gallery",
    value: "image-gallery",
  },
  {
    description: "Specification rows.",
    label: "Spec table",
    value: "spec-table",
  },
];

export function addSection(
  current: PageSchema,
  templateId: SectionTemplateId,
): { schema: PageSchema; sectionId: string } {
  const sectionId = createUniqueSectionId(current.sections, templateId);
  const section = createSection(templateId, sectionId, current.sections);

  return {
    schema: {
      ...current,
      sections: [...current.sections, section],
    },
    sectionId,
  };
}

export function duplicateSection(
  current: PageSchema,
  sectionId: string,
): { schema: PageSchema; sectionId: string } {
  const index = current.sections.findIndex((section) => section.id === sectionId);
  const section = current.sections[index];

  if (!section) {
    return { schema: current, sectionId };
  }

  const duplicatedId = createUniqueSectionId(
    current.sections,
    section.component,
  );
  const duplicated = {
    ...structuredClone(section),
    id: duplicatedId,
  };
  const sections = [...current.sections];
  sections.splice(index + 1, 0, duplicated);
  let schema: PageSchema = {
    ...current,
    sections,
  };

  schema = insertSectionAfter(schema, sectionId, duplicatedId, "desktop");
  schema = insertSectionAfter(schema, sectionId, duplicatedId, "mobile");

  return {
    schema,
    sectionId: duplicatedId,
  };
}

export function removeSection(current: PageSchema, sectionId: string): PageSchema {
  let schema: PageSchema = {
    ...current,
    sections: current.sections.filter((section) => section.id !== sectionId),
  };

  schema = removeSectionFromOrder(schema, sectionId, "desktop");
  schema = removeSectionFromOrder(schema, sectionId, "mobile");

  return schema;
}

export function getNextSelectedSectionId(
  current: PageSchema,
  sectionId: string,
  viewport?: Viewport,
): string | null {
  const sections = viewport
    ? getOrderedSectionsForViewport(current, viewport)
    : current.sections;
  const index = sections.findIndex((section) => section.id === sectionId);

  if (index < 0) {
    return sections[0]?.id ?? null;
  }

  return (
    sections[index + 1]?.id ??
    sections[index - 1]?.id ??
    null
  );
}

function insertSectionAfter(
  current: PageSchema,
  sourceSectionId: string,
  insertedSectionId: string,
  viewport: Viewport,
): PageSchema {
  const sectionOrder = getOrderedSectionsForViewport(current, viewport)
    .map((section) => section.id)
    .filter((sectionId) => sectionId !== insertedSectionId);
  const sourceIndex = sectionOrder.indexOf(sourceSectionId);
  const insertIndex =
    sourceIndex >= 0 ? sourceIndex + 1 : sectionOrder.length;

  sectionOrder.splice(insertIndex, 0, insertedSectionId);

  return setSectionOrderForViewport(current, viewport, sectionOrder);
}

function removeSectionFromOrder(
  current: PageSchema,
  sectionIdToRemove: string,
  viewport: Viewport,
): PageSchema {
  const sectionOrder = getOrderedSectionsForViewport(current, viewport)
    .map((section) => section.id)
    .filter((sectionId) => sectionId !== sectionIdToRemove);

  return setSectionOrderForViewport(current, viewport, sectionOrder);
}

function createSection(
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

function createUniqueSectionId(
  sections: SectionNode[],
  component: string,
): string {
  const base = component.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const existingIds = new Set(sections.map((section) => section.id));
  let suffix = sections.length + 1;
  let id = `${base}-${suffix}`;

  while (existingIds.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }

  return id;
}
