const unsafeHrefCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);

export function readSafeHref(value: string | undefined): string | undefined {
  const href = value?.trim();

  if (!href || !isSafeHref(href)) {
    return undefined;
  }

  return href;
}

function isSafeHref(href: string): boolean {
  if (hasUnsafeHrefCharacter(href)) {
    return false;
  }

  if (href.startsWith("/")) {
    return !href.startsWith("//");
  }

  if (href.startsWith("#")) {
    return true;
  }

  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href.length > href.indexOf(":") + 1;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const parsed = new URL(href);
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        Boolean(parsed.hostname) &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }

  return false;
}

function hasUnsafeHrefCharacter(href: string): boolean {
  return Array.from(href).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return (
      codePoint <= 0x20 ||
      codePoint === 0x7f ||
      unsafeHrefCharacters.has(character)
    );
  });
}
