import type { ReactNode } from "react";
import { readSafeImageSrc } from "../safe-image-src.js";
import { text } from "../text.js";
import type { I18nLikeText } from "../types.js";

const defaultBrandLabel = "kinolin";
const defaultBrandLogoSrc = "/brand/kinolin-logo.svg";

export function StorefrontBrandMark(props: {
  label?: I18nLikeText | string;
  logoSrc?: string;
  size?: "header" | "footer";
}): ReactNode {
  const label = text(props.label) || defaultBrandLabel;
  const src =
    readSafeImageSrc(props.logoSrc) ?? readSafeImageSrc(defaultBrandLogoSrc);
  const heightClass = props.size === "footer" ? "h-7" : "h-9";

  if (!src) {
    return label;
  }

  return <img alt={label} className={`${heightClass} w-auto`} src={src} />;
}
