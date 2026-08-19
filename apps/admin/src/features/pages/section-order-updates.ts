import {
  getOrderedSectionsForViewport,
  setSectionOrderForViewport,
  type PageSchema,
  type Viewport,
} from "@app-starter/schema";

export type SectionMoveDirection = "down" | "up";

export function copyDesktopSectionOrderToMobile(
  current: PageSchema,
): PageSchema {
  const desktopSectionOrder = getOrderedSectionsForViewport(current, "desktop")
    .map((section) => section.id);

  return setSectionOrderForViewport(current, "mobile", desktopSectionOrder);
}

export function moveSection(
  current: PageSchema,
  sectionId: string,
  direction: SectionMoveDirection,
  viewport: Viewport,
): PageSchema {
  const orderedSectionIds = getOrderedSectionsForViewport(current, viewport).map(
    (section) => section.id,
  );
  const index = orderedSectionIds.indexOf(sectionId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (!canMoveSection(orderedSectionIds, index, nextIndex)) {
    return current;
  }

  const sectionIdToMove = orderedSectionIds[index];
  const targetSectionId = orderedSectionIds[nextIndex];

  if (!sectionIdToMove || !targetSectionId) {
    return current;
  }

  orderedSectionIds[index] = targetSectionId;
  orderedSectionIds[nextIndex] = sectionIdToMove;

  return setSectionOrderForViewport(current, viewport, orderedSectionIds);
}

function canMoveSection(
  sectionIds: string[],
  index: number,
  nextIndex: number,
): boolean {
  return index >= 0 && nextIndex >= 0 && nextIndex < sectionIds.length;
}
