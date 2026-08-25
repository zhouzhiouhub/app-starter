import type { PageSchema, Viewport } from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight-types";

const orderedViewports: Viewport[] = ["desktop", "mobile"];
const mobileCanvasWidth = 390;

export function collectPageStructurePreflightIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  return [
    ...collectEmptyPageIssues(schema),
    ...collectEmptyViewportIssues(schema),
    ...collectMobileLayoutOverflowIssues(schema),
    ...collectDuplicateSectionIdIssues(schema),
    ...collectSectionOrderIssues(schema),
  ];
}

function collectEmptyPageIssues(schema: PageSchema): PublishPreflightIssue[] {
  if (schema.sections.length > 0) {
    return [];
  }

  return [
    {
      field: "sections",
      message: "Page must include at least one section before publishing.",
      severity: "error",
    },
  ];
}

function collectEmptyViewportIssues(schema: PageSchema): PublishPreflightIssue[] {
  if (schema.sections.length === 0) {
    return [];
  }

  return orderedViewports.flatMap((viewport) =>
    hasVisibleSection(schema, viewport)
      ? []
      : [
          {
            field: `sections[0].visibility.${viewport}`,
            message: `${formatViewportLabel(
              viewport,
            )} has no visible sections. Make at least one section visible for ${formatViewportLabel(
              viewport,
            )} before publishing.`,
            severity: "error",
          },
        ],
  );
}

function hasVisibleSection(schema: PageSchema, viewport: Viewport): boolean {
  return schema.sections.some((section) => section.visibility?.[viewport] !== false);
}

function collectMobileLayoutOverflowIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  return schema.sections.flatMap((section, sectionIndex) => {
    if (section.visibility?.mobile === false) {
      return [];
    }

    const layout = section.layout.mobile;

    if (!layout || layout.x + layout.width <= mobileCanvasWidth) {
      return [];
    }

    return [
      {
        field: `sections[${sectionIndex}].layout.mobile.width`,
        message: `Mobile section ${sectionIndex + 1} extends beyond the ${mobileCanvasWidth}px canvas. Reduce X or Width before publishing to avoid clipped storefront content.`,
        severity: "warning",
      },
    ];
  });
}

function collectDuplicateSectionIdIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  const seenSectionIds = new Set<string>();
  const issues: PublishPreflightIssue[] = [];

  schema.sections.forEach((section, index) => {
    if (!seenSectionIds.has(section.id)) {
      seenSectionIds.add(section.id);
      return;
    }

    issues.push({
      field: `sections[${index}].id`,
      message: `Section id "${section.id}" is duplicated. Each section needs a unique id before publishing.`,
      severity: "error",
    });
  });

  return issues;
}

function collectSectionOrderIssues(schema: PageSchema): PublishPreflightIssue[] {
  if (schema.sections.length === 0) {
    return [];
  }

  return orderedViewports.flatMap((viewport) =>
    collectViewportSectionOrderIssues(schema, viewport),
  );
}

function collectViewportSectionOrderIssues(
  schema: PageSchema,
  viewport: Viewport,
): PublishPreflightIssue[] {
  const rawSectionOrder = schema.layout[viewport].sectionOrder ?? [];

  if (rawSectionOrder.length === 0) {
    return [];
  }

  const sectionIds = schema.sections.map((section) => section.id);
  const normalizedSectionOrder = normalizeSectionOrderIds(
    sectionIds,
    rawSectionOrder,
  );

  if (areStringListsEqual(rawSectionOrder, normalizedSectionOrder)) {
    return [];
  }

  return [
    {
      field: `layout.${viewport}.sectionOrder`,
      message: `${formatViewportLabel(
        viewport,
      )} section order will be normalized before rendering because it ${formatSectionOrderDrift(
        sectionIds,
        rawSectionOrder,
      )}. Save the draft or use section reorder controls to normalize it before publishing.`,
      severity: "warning",
    },
  ];
}

function normalizeSectionOrderIds(
  sectionIds: string[],
  rawSectionOrder: string[],
): string[] {
  const validSectionIds = new Set(sectionIds);
  const seenSectionIds = new Set<string>();
  const normalizedSectionOrder: string[] = [];

  for (const sectionId of rawSectionOrder) {
    if (!validSectionIds.has(sectionId) || seenSectionIds.has(sectionId)) {
      continue;
    }

    seenSectionIds.add(sectionId);
    normalizedSectionOrder.push(sectionId);
  }

  for (const sectionId of sectionIds) {
    if (!seenSectionIds.has(sectionId)) {
      normalizedSectionOrder.push(sectionId);
    }
  }

  return normalizedSectionOrder;
}

function formatSectionOrderDrift(
  sectionIds: string[],
  rawSectionOrder: string[],
): string {
  const validSectionIds = new Set(sectionIds);
  const seenRawIds = new Set<string>();
  const includedValidIds = new Set<string>();
  let duplicateCount = 0;
  let missingCount = 0;

  for (const sectionId of rawSectionOrder) {
    if (!validSectionIds.has(sectionId)) {
      missingCount += 1;
      continue;
    }

    if (seenRawIds.has(sectionId)) {
      duplicateCount += 1;
      continue;
    }

    seenRawIds.add(sectionId);
    includedValidIds.add(sectionId);
  }

  const omittedCount = sectionIds.filter(
    (sectionId) => !includedValidIds.has(sectionId),
  ).length;
  const reasons = [
    formatCount(missingCount, "stale reference"),
    formatCount(duplicateCount, "duplicate entry"),
    formatCount(omittedCount, "omitted section"),
  ].filter(isPresent);

  return formatList(reasons);
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

function formatCount(count: number, label: string): string | null {
  return count > 0 ? `${count} ${label}${count === 1 ? "" : "s"}` : null;
}

function formatList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "does not match the current sections";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function areStringListsEqual(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function formatViewportLabel(viewport: Viewport): string {
  return viewport === "desktop" ? "Desktop" : "Mobile";
}
