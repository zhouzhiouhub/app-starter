import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight-types";

export function collectPageStructurePreflightIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  return [
    ...collectEmptyPageIssues(schema),
    ...collectDuplicateSectionIdIssues(schema),
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
