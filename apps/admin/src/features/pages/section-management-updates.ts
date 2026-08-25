import {
  getOrderedSectionsForViewport,
  setSectionOrderForViewport,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";
import {
  supportedSectionComponentIds,
  type SectionTemplateId,
} from "./section-components.ts";
import { createSection } from "./section-template-factory.ts";

export type { SectionTemplateId } from "./section-components.ts";

interface SectionTemplateOption {
  description: string;
  label: string;
  value: SectionTemplateId;
}

const sectionTemplateDetails: Record<
  SectionTemplateId,
  Omit<SectionTemplateOption, "value">
> = {
  "hero-banner": {
    description: "Large campaign header.",
    label: "Hero",
  },
  "rich-text": {
    description: "Editorial text block.",
    label: "Rich text",
  },
  "cta-bar": {
    description: "Conversion callout.",
    label: "CTA",
  },
  faq: {
    description: "Question and answer list.",
    label: "FAQ",
  },
  "image-gallery": {
    description: "Image grid.",
    label: "Image gallery",
  },
  "spec-table": {
    description: "Specification rows.",
    label: "Spec table",
  },
};

export const sectionTemplateOptions: SectionTemplateOption[] =
  supportedSectionComponentIds.map((value) => ({
    ...sectionTemplateDetails[value],
    value,
  }));

export function addSection(
  current: PageSchema,
  templateId: SectionTemplateId,
): { schema: PageSchema; sectionId: string } {
  const sectionId = createUniqueSectionId(current.sections, templateId);
  const section = createSection(templateId, sectionId, current.sections);
  let schema: PageSchema = {
    ...current,
    sections: [...current.sections, section],
  };

  schema = appendSectionToOrder(schema, sectionId, "desktop");
  schema = appendSectionToOrder(schema, sectionId, "mobile");

  return {
    schema,
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

function appendSectionToOrder(
  current: PageSchema,
  insertedSectionId: string,
  viewport: Viewport,
): PageSchema {
  const sectionOrder = getOrderedSectionsForViewport(current, viewport)
    .map((section) => section.id)
    .filter((sectionId) => sectionId !== insertedSectionId);

  sectionOrder.push(insertedSectionId);

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
