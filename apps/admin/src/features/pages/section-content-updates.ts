import type { PageSchema, SectionNode } from "@app-starter/schema";

export type SectionTextValueKind = "i18n" | "plain";

export function updatePageMetaTitle(
  current: PageSchema,
  title: string,
): PageSchema {
  const shouldSyncSeoTitle = current.seo.title === current.meta.title;

  return {
    ...current,
    meta: {
      ...current.meta,
      title,
    },
    seo: {
      ...current.seo,
      title: shouldSyncSeoTitle ? title : current.seo.title,
    },
  };
}

export function updateSectionTextField(
  current: PageSchema,
  sectionId: string,
  field: string,
  value: string,
  valueKind: SectionTextValueKind,
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      return withProps(section, {
        ...section.props,
        [field]:
          valueKind === "plain"
            ? value
            : writeText(section.props[field], value),
      });
    }),
  };
}

export function updateFirstHeroField(
  current: PageSchema,
  field: "title" | "body" | "eyebrow",
  value: string,
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section, index) => {
      if (index !== findFirstIndex(current.sections, "hero-banner")) {
        return section;
      }

      if (field === "eyebrow") {
        return withProps(section, { ...section.props, eyebrow: value });
      }

      return withProps(section, {
        ...section.props,
        [field]: writeText(section.props[field], value),
      });
    }),
  };
}

export function updateFirstRichTextField(
  current: PageSchema,
  field: "title" | "content",
  value: string,
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section, index) => {
      if (index !== findFirstIndex(current.sections, "rich-text")) {
        return section;
      }

      return withProps(section, {
        ...section.props,
        [field]: writeText(section.props[field], value),
      });
    }),
  };
}

export function readSectionText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "defaultValue" in value &&
    typeof value.defaultValue === "string"
  ) {
    return value.defaultValue;
  }

  return "";
}

function findFirstIndex(
  sections: SectionNode[],
  component: string,
): number {
  return sections.findIndex((section) => section.component === component);
}

function withProps(
  section: SectionNode,
  props: Record<string, unknown>,
): SectionNode {
  return {
    ...section,
    props,
  };
}

function writeText(
  current: unknown,
  value: string,
): { defaultValue: string; i18nKey?: string } {
  if (
    current &&
    typeof current === "object" &&
    "i18nKey" in current &&
    typeof current.i18nKey === "string"
  ) {
    return {
      defaultValue: value,
      i18nKey: current.i18nKey,
    };
  }

  return { defaultValue: value };
}
