import type { ReactNode } from "react";
import { ChromeLink } from "../chrome-link.js";
import { storefrontShellClassName } from "../storefront-shell.js";
import { text } from "../text.js";
import { StorefrontBrandMark } from "./storefront-brand-mark.js";
import type {
  StorefrontChromeVariant,
  StorefrontHeaderContent,
} from "../types.js";

export function StorefrontHeader(props: {
  variant?: StorefrontChromeVariant;
  content?: StorefrontHeaderContent;
  currentLocale?: string;
}): ReactNode {
  const isMinimal = props.variant === "minimal";
  const brand = props.content?.brand;
  const navigation = props.content?.navigation ?? [];
  const localeSwitcher = props.content?.localeSwitcher;
  const localeOptions = localeSwitcher?.locales ?? [];
  const showLocaleSwitcher =
    localeSwitcher?.enabled !== false && localeOptions.length > 0;
  const localeSwitcherLabel = text(localeSwitcher?.label) || "Language";
  const currentLocale =
    localeOptions.find((locale) => locale.code === props.currentLocale) ??
    localeOptions[0];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div
        className={`${storefrontShellClassName} flex min-h-16 items-center justify-between gap-4`}
      >
        <ChromeLink
          blockedDataName="data-chrome-brand-href-blocked"
          className="inline-flex items-center"
          fallbackHref="/"
          href={brand?.href}
        >
          <StorefrontBrandMark
            label={brand?.label}
            logoSrc={brand?.logoSrc}
            size="header"
          />
        </ChromeLink>
        {isMinimal ? null : (
          <div className="flex items-center gap-6">
            {navigation.length === 0 ? null : (
              <nav
                aria-label="Main navigation"
                className="flex items-center gap-6"
              >
                {navigation.map((item) => (
                  <ChromeLink
                    blockedDataName="data-chrome-navigation-href-blocked"
                    className="text-sm font-medium text-gray-600 hover:text-gray-950"
                    href={item.href}
                    key={item.id ?? `${item.href}-${text(item.label)}`}
                    openInNewTab={item.openInNewTab}
                  >
                    {text(item.label)}
                  </ChromeLink>
                ))}
              </nav>
            )}
            {showLocaleSwitcher ? (
              <details
                aria-label={localeSwitcherLabel}
                className="relative"
                title={localeSwitcherLabel}
              >
                <summary className="cursor-pointer list-none rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700">
                  {text(currentLocale?.label) || props.currentLocale}
                </summary>
                <div className="absolute right-0 z-10 mt-2 min-w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {localeOptions.map((locale) => (
                    <ChromeLink
                      blockedDataName="data-chrome-locale-href-blocked"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                      href={locale.href ?? `/${locale.code}`}
                      key={locale.code}
                    >
                      {text(locale.label)}
                    </ChromeLink>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
