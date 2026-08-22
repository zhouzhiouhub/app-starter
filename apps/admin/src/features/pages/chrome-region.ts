import {
  getPageTemplateChrome,
  type ChromeNavigationItem,
  type PageChromeSettings,
  type PageSchema,
  type PageTemplateId,
} from "@app-starter/schema";

export type ChromeRegionKey = keyof PageChromeSettings;

export function applyPageTemplate(
  current: PageSchema,
  templateId: PageTemplateId,
): PageSchema {
  return {
    ...current,
    chrome: getPageTemplateChrome(templateId),
    template: { id: templateId },
  };
}

export function updateChromeEnabled(
  current: PageSchema,
  region: ChromeRegionKey,
  enabled: boolean,
): PageSchema {
  return {
    ...current,
    chrome: {
      ...current.chrome,
      [region]: {
        ...current.chrome[region],
        enabled,
      },
    },
  };
}

export function updateChromeVariant(
  current: PageSchema,
  region: ChromeRegionKey,
  variant: PageChromeSettings[ChromeRegionKey]["variant"],
): PageSchema {
  return {
    ...current,
    chrome: {
      ...current.chrome,
      [region]: {
        ...current.chrome[region],
        variant,
      },
    },
  };
}

export function updateNavigationItem(
  current: PageSchema,
  region: ChromeRegionKey,
  index: number,
  field: "label" | "href",
  value: string,
): PageSchema {
  const chromeRegion = current.chrome[region];
  const navigation = chromeRegion.content.navigation.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    return field === "label"
      ? {
          ...item,
          label: {
            ...item.label,
            defaultValue: value,
          },
        }
      : {
          ...item,
          href: value,
        };
  });

  return replaceRegionNavigation(current, region, navigation);
}

export function addNavigationItem(
  current: PageSchema,
  region: ChromeRegionKey,
): PageSchema {
  const chromeRegion = current.chrome[region];
  const itemNumber = chromeRegion.content.navigation.length + 1;
  const item: ChromeNavigationItem = {
    href: "/",
    id: `${region}-link-${Date.now()}`,
    label: { defaultValue: `Link ${itemNumber}` },
    openInNewTab: false,
  };

  return replaceRegionNavigation(current, region, [
    ...chromeRegion.content.navigation,
    item,
  ]);
}

export function removeNavigationItem(
  current: PageSchema,
  region: ChromeRegionKey,
  index: number,
): PageSchema {
  const chromeRegion = current.chrome[region];

  return replaceRegionNavigation(
    current,
    region,
    chromeRegion.content.navigation.filter(
      (_, itemIndex) => itemIndex !== index,
    ),
  );
}

export function replaceHeaderContent(
  current: PageSchema,
  content: PageSchema["chrome"]["header"]["content"],
): PageSchema {
  return {
    ...current,
    chrome: {
      ...current.chrome,
      header: {
        ...current.chrome.header,
        content,
      },
    },
  };
}

export function replaceFooterContent(
  current: PageSchema,
  content: PageSchema["chrome"]["footer"]["content"],
): PageSchema {
  return {
    ...current,
    chrome: {
      ...current.chrome,
      footer: {
        ...current.chrome.footer,
        content,
      },
    },
  };
}

function replaceRegionNavigation(
  current: PageSchema,
  region: ChromeRegionKey,
  navigation: ChromeNavigationItem[],
): PageSchema {
  const chromeRegion = current.chrome[region];

  return {
    ...current,
    chrome: {
      ...current.chrome,
      [region]: {
        ...chromeRegion,
        content: {
          ...chromeRegion.content,
          navigation,
        },
      },
    },
  };
}
