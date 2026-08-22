import type { CSSProperties } from "react";
import type { SectionNode, Viewport } from "@app-starter/schema";

export function createSectionLayoutStyle(
  node: SectionNode,
  viewport: Viewport,
  verticalOffset = 0,
): CSSProperties | undefined {
  const layout = node.layout[viewport];

  if (!layout) {
    return undefined;
  }

  return {
    boxSizing: "border-box",
    gap: layout.gap,
    marginLeft: layout.x,
    marginRight: "auto",
    marginTop: verticalOffset > 0 ? verticalOffset : undefined,
    maxWidth: "100%",
    minHeight: layout.height,
    padding: layout.padding,
    width: layout.width,
  };
}

export function createSectionVerticalOffsets(
  sections: SectionNode[],
  viewport: Viewport,
): Map<string, number> {
  const offsets = new Map<string, number>();
  let previousVisibleBottom = 0;

  for (const section of sections) {
    if (section.visibility?.[viewport] === false) {
      continue;
    }

    const layout = section.layout[viewport];

    if (!layout) {
      offsets.set(section.id, 0);
      continue;
    }

    offsets.set(section.id, Math.max(0, layout.y - previousVisibleBottom));
    previousVisibleBottom = Math.max(
      previousVisibleBottom,
      layout.y + (layout.height ?? 0),
    );
  }

  return offsets;
}
