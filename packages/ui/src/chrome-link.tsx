import type { ReactNode } from "react";
import { readSafeHref } from "./safe-href.js";

export function ChromeLink(props: {
  blockedDataName: string;
  children: ReactNode;
  className: string;
  fallbackHref?: string;
  href?: string;
  openInNewTab?: boolean;
}): ReactNode {
  const rawHref = props.href ?? props.fallbackHref;
  const href = readSafeHref(rawHref);

  if (!href) {
    return (
      <span
        className={props.className}
        {...{ [props.blockedDataName]: rawHref?.trim() || "empty" }}
      >
        {props.children}
      </span>
    );
  }

  return (
    <a
      className={props.className}
      href={href}
      rel={props.openInNewTab ? "noopener noreferrer" : undefined}
      target={props.openInNewTab ? "_blank" : undefined}
    >
      {props.children}
    </a>
  );
}
