export interface I18nLikeText {
  defaultValue: string;
  i18nKey?: string;
}

export type StorefrontChromeVariant = "default" | "minimal";

export interface StorefrontNavigationItem {
  id?: string;
  label: I18nLikeText | string;
  href: string;
  openInNewTab?: boolean;
}

export interface StorefrontLocaleOption {
  code: string;
  label: I18nLikeText | string;
  href?: string;
}

export interface StorefrontLocaleSwitcherContent {
  enabled?: boolean;
  label?: I18nLikeText | string;
  locales?: StorefrontLocaleOption[];
}

export interface StorefrontHeaderContent {
  brand?: {
    href?: string;
    label: I18nLikeText | string;
    logoSrc?: string;
  };
  navigation?: StorefrontNavigationItem[];
  localeSwitcher?: StorefrontLocaleSwitcherContent;
}

export interface StorefrontFooterContent {
  brand?: {
    href?: string;
    label: I18nLikeText | string;
    logoSrc?: string;
  };
  copyright?: I18nLikeText | string;
  navigation?: StorefrontNavigationItem[];
}
