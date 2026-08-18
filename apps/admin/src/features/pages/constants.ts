import { pageTemplatePresets } from "@app-starter/schema";

export const pageTemplateOptions = Object.values(pageTemplatePresets).map(
  (template) => ({
    label: template.label,
    value: template.id,
  }),
);

export const DEFAULT_PAGE_LIST_LIMIT = 20;
