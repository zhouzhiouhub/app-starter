import type { ChromeLocaleOption, PageSchema } from "@app-starter/schema";
import { replaceHeaderContent } from "./chrome-region.ts";

export function updateHeaderBrand(
  current: PageSchema,
  field: "label" | "href" | "logoSrc",
  value: string,
): PageSchema {
  const content = current.chrome.header.content;
  const brand =
    field === "label"
      ? {
          ...content.brand,
          label: {
            ...content.brand.label,
            defaultValue: value,
          },
        }
      : field === "logoSrc"
        ? {
            ...content.brand,
            logoSrc: value.trim() || content.brand.logoSrc,
          }
        : {
            ...content.brand,
            href: value,
          };

  return replaceHeaderContent(current, { ...content, brand });
}

export function updateHeaderLocaleSwitcherEnabled(
  current: PageSchema,
  enabled: boolean,
): PageSchema {
  const content = current.chrome.header.content;

  return replaceHeaderContent(current, {
    ...content,
    localeSwitcher: {
      ...content.localeSwitcher,
      enabled,
    },
  });
}

export function updateHeaderLocaleSwitcherLabel(
  current: PageSchema,
  value: string,
): PageSchema {
  const content = current.chrome.header.content;

  return replaceHeaderContent(current, {
    ...content,
    localeSwitcher: {
      ...content.localeSwitcher,
      label: {
        ...content.localeSwitcher.label,
        defaultValue: value,
      },
    },
  });
}

export function updateHeaderLocaleOption(
  current: PageSchema,
  index: number,
  field: "code" | "label" | "href",
  value: string,
): PageSchema {
  const content = current.chrome.header.content;
  const locales = content.localeSwitcher.locales.map((locale, localeIndex) => {
    if (localeIndex !== index) {
      return locale;
    }

    return patchLocaleOption(locale, field, value);
  });

  return replaceHeaderContent(current, {
    ...content,
    localeSwitcher: {
      ...content.localeSwitcher,
      locales,
    },
  });
}

export function addHeaderLocaleOption(current: PageSchema): PageSchema {
  const content = current.chrome.header.content;
  const locale: ChromeLocaleOption = {
    code: "",
    label: { defaultValue: "" },
  };

  return replaceHeaderContent(current, {
    ...content,
    localeSwitcher: {
      ...content.localeSwitcher,
      locales: [...content.localeSwitcher.locales, locale],
    },
  });
}

export function removeHeaderLocaleOption(
  current: PageSchema,
  index: number,
): PageSchema {
  const content = current.chrome.header.content;

  return replaceHeaderContent(current, {
    ...content,
    localeSwitcher: {
      ...content.localeSwitcher,
      locales: content.localeSwitcher.locales.filter(
        (_, localeIndex) => localeIndex !== index,
      ),
    },
  });
}

function patchLocaleOption(
  locale: ChromeLocaleOption,
  field: "code" | "label" | "href",
  value: string,
): ChromeLocaleOption {
  if (field === "code") {
    return { ...locale, code: value };
  }

  if (field === "label") {
    return {
      ...locale,
      label: {
        ...locale.label,
        defaultValue: value,
      },
    };
  }

  if (!value.trim()) {
    return {
      code: locale.code,
      label: locale.label,
    };
  }

  return { ...locale, href: value };
}
