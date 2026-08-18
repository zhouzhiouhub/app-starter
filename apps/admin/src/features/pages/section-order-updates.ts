import type { PageSchema, SectionNode } from "@app-starter/schema";

export type SectionMoveDirection = "down" | "up";

export function moveSection(
  current: PageSchema,
  sectionId: string,
  direction: SectionMoveDirection,
): PageSchema {
  const index = current.sections.findIndex(
    (section) => section.id === sectionId,
  );
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (!canMoveSection(current.sections, index, nextIndex)) {
    return current;
  }

  const sections = [...current.sections];
  const section = sections[index];
  const target = sections[nextIndex];

  if (!section || !target) {
    return current;
  }

  sections[index] = target;
  sections[nextIndex] = section;

  return {
    ...current,
    sections,
  };
}

function canMoveSection(
  sections: SectionNode[],
  index: number,
  nextIndex: number,
): boolean {
  return index >= 0 && nextIndex >= 0 && nextIndex < sections.length;
}
