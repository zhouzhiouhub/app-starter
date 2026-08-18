import type { ReactNode } from "react";
import { text } from "../text.js";
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
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-6 md:px-10">
        <a
          className="text-base font-semibold text-gray-950"
          href={brand?.href ?? "/"}
        >
          {text(brand?.label) || "App Starter"}
        </a>
        {isMinimal ? null : (
          <div className="flex items-center gap-6">
            {navigation.length === 0 ? null : (
              <nav
                aria-label="Main navigation"
                className="flex items-center gap-6"
              >
                {navigation.map((item) => (
                  <a
                    className="text-sm font-medium text-gray-600 hover:text-gray-950"
                    href={item.href}
                    key={item.id ?? `${item.href}-${text(item.label)}`}
                    rel={item.openInNewTab ? "noreferrer" : undefined}
                    target={item.openInNewTab ? "_blank" : undefined}
                  >
                    {text(item.label)}
                  </a>
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
                    <a
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                      href={locale.href ?? `/${locale.code}`}
                      key={locale.code}
                    >
                      {text(locale.label)}
                    </a>
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
