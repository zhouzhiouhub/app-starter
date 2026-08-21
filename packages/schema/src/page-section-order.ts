import type { SectionNode, Viewport } from "./foundation.js";
import type { PageSchema } from "./page-schema-core.js";

export function getOrderedSectionsForViewport(
  schema: PageSchema,
  viewport: Viewport,
): SectionNode[] {
  const sectionsById = new Map(
    schema.sections.map((section) => [section.id, section]),
  );
  const orderedSections: SectionNode[] = [];

  for (const sectionId of normalizeSectionOrder(
    schema.sections,
    schema.layout[viewport].sectionOrder,
  )) {
    const section = sectionsById.get(sectionId);

    if (section) {
      orderedSections.push(section);
    }
  }

  return orderedSections;
}

export function setSectionOrderForViewport(
  schema: PageSchema,
  viewport: Viewport,
  sectionOrder: string[],
): PageSchema {
  return {
    ...schema,
    layout: {
      ...schema.layout,
      [viewport]: {
        ...schema.layout[viewport],
        sectionOrder: normalizeSectionOrder(schema.sections, sectionOrder),
      },
    },
  };
}

function normalizeSectionOrder(
  sections: SectionNode[],
  sectionOrder: string[] = [],
): string[] {
  const sectionIds = new Set(sections.map((section) => section.id));
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const sectionId of sectionOrder) {
    if (!sectionIds.has(sectionId) || seen.has(sectionId)) {
      continue;
    }

    seen.add(sectionId);
    normalized.push(sectionId);
  }

  for (const section of sections) {
    if (!seen.has(section.id)) {
      normalized.push(section.id);
    }
  }

  return normalized;
}
