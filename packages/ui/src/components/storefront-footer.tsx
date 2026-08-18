import type { ReactNode } from "react";
import { text } from "../text.js";
import type {
  StorefrontChromeVariant,
  StorefrontFooterContent,
} from "../types.js";

export function StorefrontFooter(props: {
  variant?: StorefrontChromeVariant;
  content?: StorefrontFooterContent;
}): ReactNode {
  const isMinimal = props.variant === "minimal";
  const brand = props.content?.brand;
  const navigation = props.content?.navigation ?? [];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-gray-600 md:flex-row md:items-center md:justify-between md:px-10">
        <div>
          <a
            className="font-medium text-gray-700 hover:text-gray-950"
            href={brand?.href ?? "/"}
          >
            {text(brand?.label) || "App Starter"}
          </a>
          {props.content?.copyright ? (
            <p className="mt-1 text-gray-500">
              {text(props.content.copyright)}
            </p>
          ) : null}
        </div>
        {isMinimal || navigation.length === 0 ? null : (
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">
            {navigation.map((item) => (
              <a
                className="hover:text-gray-950"
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
      </div>
    </footer>
  );
}
