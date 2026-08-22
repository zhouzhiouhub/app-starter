import type { I18nLikeText } from "./types.js";

export function text(value: I18nLikeText | string | undefined): string {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value.defaultValue;
}
