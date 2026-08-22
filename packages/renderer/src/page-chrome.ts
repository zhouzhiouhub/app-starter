import type { ReactNode } from "react";
import {
  getStorefrontHref,
  rewriteStorefrontHref,
  type FooterChromeContent,
  type HeaderChromeContent,
  type PageChromeRegion,
  type PageSchema,
} from "@app-starter/schema";

export function renderChromeSlot(
  region: PageChromeRegion,
  slot: ReactNode | ((region: PageChromeRegion) => ReactNode) | undefined,
  fallback: ReactNode,
): ReactNode {
  if (!region.enabled) {
    return null;
  }

  if (typeof slot === "function") {
    return slot(region);
  }

  return slot ?? fallback;
}

export function resolveHeaderContent(schema: PageSchema): HeaderChromeContent {
  const content = schema.chrome.header.content;
  const localeSwitcher = content.localeSwitcher;

  return {
    ...content,
    brand: {
      ...content.brand,
      href: rewriteStorefrontHref(content.brand.href),
    },
    navigation: content.navigation.map((item) => ({
      ...item,
      href: rewriteStorefrontHref(item.href),
    })),
    localeSwitcher: {
      ...localeSwitcher,
      locales: localeSwitcher.locales.map((locale) => ({
        ...locale,
        href: rewriteStorefrontHref(
          locale.href ?? getStorefrontHref(locale.code, schema.meta.slug),
        ),
      })),
    },
  };
}

export function resolveFooterContent(schema: PageSchema): FooterChromeContent {
  const content = schema.chrome.footer.content;

  return {
    ...content,
    brand: {
      ...content.brand,
      href: rewriteStorefrontHref(content.brand.href),
    },
    navigation: content.navigation.map((item) => ({
      ...item,
      href: rewriteStorefrontHref(item.href),
    })),
  };
}
