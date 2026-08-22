import type { ReactNode } from "react";
import { sanitizeRichText } from "../sanitize-rich-text.js";
import { text } from "../text.js";
import type { I18nLikeText } from "../types.js";

export function RichText(props: {
  title?: I18nLikeText | string;
  content?: I18nLikeText | string;
}): ReactNode {
  const content = sanitizeRichText(text(props.content));

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      {props.title ? (
        <h2 className="mb-5 text-3xl font-semibold text-gray-950">
          {text(props.title)}
        </h2>
      ) : null}
      <div
        className="space-y-4 text-base leading-8 text-gray-700"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
