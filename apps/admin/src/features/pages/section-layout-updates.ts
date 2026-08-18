import type {
  LayoutBox,
  PageSchema,
  SectionNode,
  Viewport,
} from "@app-starter/schema";

export type SectionLayoutField = "height" | "width" | "x" | "y";

export function readSectionLayout(
  section: SectionNode,
  viewport: Viewport,
): LayoutBox {
  return (
    section.layout[viewport] ?? {
      width: viewport === "desktop" ? 1200 : 390,
      x: 0,
      y: 0,
    }
  );
}

export function updateSectionLayoutField(
  current: PageSchema,
  sectionId: string,
  viewport: Viewport,
  field: SectionLayoutField,
  value: number,
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      const layout = readSectionLayout(section, viewport);

      return {
        ...section,
        layout: {
          ...section.layout,
          [viewport]: {
            ...layout,
            [field]: value,
          },
        },
      };
    }),
  };
}

export function updateSectionVisibility(
  current: PageSchema,
  sectionId: string,
  viewport: Viewport,
  visible: boolean,
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      return {
        ...section,
        visibility: {
          ...section.visibility,
          [viewport]: visible,
        },
      };
    }),
  };
}

export function copyDesktopLayoutToMobile(
  current: PageSchema,
  sectionId: string,
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      const desktopLayout = readSectionLayout(section, "desktop");

      return {
        ...section,
        layout: {
          ...section.layout,
          mobile: {
            ...desktopLayout,
            width: Math.min(desktopLayout.width, 390),
          },
        },
      };
    }),
  };
}
