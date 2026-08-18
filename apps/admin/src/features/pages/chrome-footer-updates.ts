import type { PageSchema } from "@app-starter/schema";
import { replaceFooterContent } from "./chrome-region";

export function updateFooterBrand(
  current: PageSchema,
  field: "label" | "href",
  value: string,
): PageSchema {
  const content = current.chrome.footer.content;
  const brand =
    field === "label"
      ? {
          ...content.brand,
          label: {
            ...content.brand.label,
            defaultValue: value,
          },
        }
      : {
          ...content.brand,
          href: value,
        };

  return replaceFooterContent(current, { ...content, brand });
}

export function updateFooterCopyright(
  current: PageSchema,
  value: string,
): PageSchema {
  const content = current.chrome.footer.content;

  return replaceFooterContent(current, {
    ...content,
    copyright: {
      ...content.copyright,
      defaultValue: value,
    },
  });
}
