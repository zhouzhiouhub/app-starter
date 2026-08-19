const safeHrefPattern = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/;

export function readSafeHref(value: string | undefined): string | undefined {
  const href = value?.trim();

  if (!href || !safeHrefPattern.test(href)) {
    return undefined;
  }

  return href;
}
