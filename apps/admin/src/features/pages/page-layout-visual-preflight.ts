import {
  getOrderedSectionsForViewport,
  type LayoutBox,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight-types";

const viewportCanvasWidths: Record<Viewport, number> = {
  desktop: 1200,
  mobile: 390,
};
const orderedViewports: Viewport[] = ["desktop", "mobile"];

export function collectPageLayoutVisualPreflightIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  return orderedViewports.flatMap((viewport) => [
    ...collectCanvasOverflowIssues(schema, viewport),
    ...collectVerticalCompressionIssues(schema, viewport),
  ]);
}

function collectCanvasOverflowIssues(
  schema: PageSchema,
  viewport: Viewport,
): PublishPreflightIssue[] {
  return schema.sections.flatMap((section, sectionIndex) => {
    const layout = readVisibleLayout(section, viewport);

    if (!layout) {
      return [];
    }

    const issues: PublishPreflightIssue[] = [];
    const viewportLabel = formatViewportLabel(viewport);
    const canvasWidth = viewportCanvasWidths[viewport];

    if (layout.x < 0) {
      issues.push({
        field: `sections[${sectionIndex}].layout.${viewport}.x`,
        message: `${viewportLabel} section ${
          sectionIndex + 1
        } starts before the canvas left edge. Increase X before publishing to avoid clipped storefront content.`,
        severity: "warning",
      });
    }

    if (layout.x + layout.width > canvasWidth) {
      issues.push({
        field: `sections[${sectionIndex}].layout.${viewport}.width`,
        message: `${viewportLabel} section ${
          sectionIndex + 1
        } extends beyond the ${canvasWidth}px canvas. Reduce X or Width before publishing to avoid clipped storefront content.`,
        severity: "warning",
      });
    }

    return issues;
  });
}

function collectVerticalCompressionIssues(
  schema: PageSchema,
  viewport: Viewport,
): PublishPreflightIssue[] {
  const sections = getOrderedSectionsForViewport(schema, viewport);
  const issues: PublishPreflightIssue[] = [];
  let previousVisible: VisualSectionPosition | null = null;

  for (const section of sections) {
    const position = readVisualSectionPosition(schema, section, viewport);

    if (!position) {
      continue;
    }

    if (
      previousVisible &&
      previousVisible.layout.height &&
      position.layout.y < previousVisible.layout.y + previousVisible.layout.height
    ) {
      issues.push(
        createVerticalCompressionIssue(position, previousVisible, viewport),
      );
    }

    previousVisible = position;
  }

  return issues;
}

function createVerticalCompressionIssue(
  section: VisualSectionPosition,
  previous: VisualSectionPosition,
  viewport: Viewport,
): PublishPreflightIssue {
  const viewportLabel = formatViewportLabel(viewport);

  return {
    field: `sections[${section.index}].layout.${viewport}.y`,
    message: `${viewportLabel} section ${
      section.index + 1
    } starts before section ${
      previous.index + 1
    } ends. Renderer will remove the negative vertical gap, so review Y and Height before publishing to match the visual design.`,
    severity: "warning",
  };
}

function readVisualSectionPosition(
  schema: PageSchema,
  section: SectionNode,
  viewport: Viewport,
): VisualSectionPosition | null {
  const index = schema.sections.indexOf(section);
  const layout = readVisibleLayout(section, viewport);

  if (index < 0 || !layout) {
    return null;
  }

  return { index, layout };
}

function readVisibleLayout(
  section: SectionNode,
  viewport: Viewport,
): LayoutBox | null {
  if (section.visibility?.[viewport] === false) {
    return null;
  }

  return section.layout[viewport] ?? null;
}

function formatViewportLabel(viewport: Viewport): string {
  return viewport === "desktop" ? "Desktop" : "Mobile";
}

interface VisualSectionPosition {
  index: number;
  layout: LayoutBox;
}
