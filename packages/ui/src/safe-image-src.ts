const unsafeImageSrcCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);

export function readSafeImageSrc(value: string | undefined): string | undefined {
  const src = value?.trim();

  if (!src || !isSafeImageSrc(src)) {
    return undefined;
  }

  return src;
}

function isSafeImageSrc(src: string): boolean {
  if (hasUnsafeImageSrcCharacter(src)) {
    return false;
  }

  if (src.startsWith("/")) {
    return !src.startsWith("//");
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const parsed = new URL(src);

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

function hasUnsafeImageSrcCharacter(src: string): boolean {
  return Array.from(src).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return (
      codePoint <= 0x20 ||
      codePoint === 0x7f ||
      unsafeImageSrcCharacters.has(character)
    );
  });
}
