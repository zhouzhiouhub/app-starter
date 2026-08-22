import type { SectionNode } from "@app-starter/schema";
import { readSectionText } from "./section-content-updates";

export function getSectionLabel(section: SectionNode): string {
  const title = readSectionText(section.props.title);

  if (title) {
    return title;
  }

  const eyebrow = readSectionText(section.props.eyebrow);
  return eyebrow || section.component;
}
