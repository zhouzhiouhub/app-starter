import type { ReactNode } from "react";
import { text } from "../text.js";
import type { I18nLikeText } from "../types.js";

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
