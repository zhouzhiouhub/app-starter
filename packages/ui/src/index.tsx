import type { ReactNode } from "react";

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

export interface StorefrontHeaderContent {
  brand?: {
    label: I18nLikeText | string;
    href?: string;
  };
  navigation?: StorefrontNavigationItem[];
}

export interface StorefrontFooterContent {
  brand?: {
    label: I18nLikeText | string;
    href?: string;
  };
  copyright?: I18nLikeText | string;
  navigation?: StorefrontNavigationItem[];
}

function text(value: I18nLikeText | string | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.defaultValue;
}

export function StorefrontHeader(props: {
  variant?: StorefrontChromeVariant;
  content?: StorefrontHeaderContent;
}): ReactNode {
  const isMinimal = props.variant === "minimal";
  const brand = props.content?.brand;
  const navigation = props.content?.navigation ?? [];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-6 md:px-10">
        <a className="text-base font-semibold text-gray-950" href={brand?.href ?? "/"}>
          {text(brand?.label) || "App Starter"}
        </a>
        {isMinimal || navigation.length === 0 ? null : (
          <nav aria-label="Main navigation" className="flex items-center gap-6">
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
      </div>
    </header>
  );
}

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
          <a className="font-medium text-gray-700 hover:text-gray-950" href={brand?.href ?? "/"}>
            {text(brand?.label) || "App Starter"}
          </a>
          {props.content?.copyright ? (
            <p className="mt-1 text-gray-500">{text(props.content.copyright)}</p>
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

export function HeroBanner(props: {
  eyebrow?: string;
  title?: I18nLikeText | string;
  body?: I18nLikeText | string;
  ctaLabel?: string;
}): ReactNode {
  return (
    <section className="mx-auto grid min-h-[520px] max-w-6xl content-center gap-6 px-6 py-20 md:px-10">
      {props.eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          {props.eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-gray-950 md:text-7xl">
        {text(props.title)}
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-gray-600">
        {text(props.body)}
      </p>
      {props.ctaLabel ? (
        <div>
          <span className="inline-flex rounded-md bg-gray-950 px-5 py-3 text-sm font-semibold text-white">
            {props.ctaLabel}
          </span>
        </div>
      ) : null}
    </section>
  );
}

export function RichText(props: {
  title?: I18nLikeText | string;
  content?: I18nLikeText | string;
}): ReactNode {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      {props.title ? (
        <h2 className="mb-5 text-3xl font-semibold text-gray-950">
          {text(props.title)}
        </h2>
      ) : null}
      <p className="text-base leading-8 text-gray-700">{text(props.content)}</p>
    </section>
  );
}

export function ImageGallery(props: {
  images?: Array<{ src: string; alt?: string }>;
}): ReactNode {
  const images = props.images ?? [];
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3 md:px-10">
      {images.map((image) => (
        <img
          alt={image.alt ?? ""}
          className="aspect-[4/3] w-full rounded-md object-cover"
          key={image.src}
          src={image.src}
        />
      ))}
    </section>
  );
}

export function CtaBar(props: {
  title?: I18nLikeText | string;
  ctaLabel?: string;
}): ReactNode {
  return (
    <section className="border-y border-gray-200 bg-gray-50 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold text-gray-950">
          {text(props.title)}
        </h2>
        {props.ctaLabel ? (
          <span className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            {props.ctaLabel}
          </span>
        ) : null}
      </div>
    </section>
  );
}

export function Faq(props: {
  items?: Array<{ question: string; answer: string }>;
}): ReactNode {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      {(props.items ?? []).map((item) => (
        <details className="border-b border-gray-200 py-4" key={item.question}>
          <summary className="cursor-pointer font-semibold text-gray-950">
            {item.question}
          </summary>
          <p className="pt-3 leading-7 text-gray-600">{item.answer}</p>
        </details>
      ))}
    </section>
  );
}

export function SpecTable(props: {
  rows?: Array<{ label: string; value: string }>;
}): ReactNode {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      <dl className="divide-y divide-gray-200 border-y border-gray-200">
        {(props.rows ?? []).map((row) => (
          <div className="grid gap-2 py-4 md:grid-cols-3" key={row.label}>
            <dt className="font-medium text-gray-950">{row.label}</dt>
            <dd className="md:col-span-2 text-gray-600">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
