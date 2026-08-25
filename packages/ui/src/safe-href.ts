import { isSafeHref } from "@app-starter/schema";

export function readSafeHref(value: string | undefined): string | undefined {
  const href = value?.trim();

  if (!href || !isSafeHref(href)) {
    return undefined;
  }

  return href;
}
