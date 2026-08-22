import type { ReactNode } from "react";
import { readSafeHref } from "../safe-href.js";
import { text } from "../text.js";
import type { I18nLikeText } from "../types.js";

export function HeroBanner(props: {
  eyebrow?: string;
  title?: I18nLikeText | string;
  body?: I18nLikeText | string;
  ctaHref?: string;
  ctaLabel?: string;
}): ReactNode {
  const ctaHref = readSafeHref(props.ctaHref);

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
          {ctaHref ? (
            <a
              className="inline-flex rounded-md bg-gray-950 px-5 py-3 text-sm font-semibold text-white"
              href={ctaHref}
            >
              {props.ctaLabel}
            </a>
          ) : (
            <span
              className="inline-flex rounded-md bg-gray-950 px-5 py-3 text-sm font-semibold text-white"
              data-cta-href-blocked={props.ctaHref?.trim() || undefined}
            >
              {props.ctaLabel}
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}
