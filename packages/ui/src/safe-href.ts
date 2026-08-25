const unsafeHrefCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);
const sensitiveHrefParameterKeySuffixes = [
  "accesstoken",
  "apikey",
  "clientsecret",
  "credential",
  "cookie",
  "databaseurl",
  "dsn",
  "idtoken",
  "jwt",
  "keypairid",
  "password",
  "previewtoken",
  "privatekey",
  "refreshtoken",
  "secret",
  "session",
  "sessionid",
  "signature",
  "token",
];
const sensitiveHrefParameterKeys = new Set([
  "policy",
  "sig",
  ...sensitiveHrefParameterKeySuffixes,
]);
const hrefParameterPattern = /(?:^|[?&#;])([^=\s&#;]+)=/g;

export function readSafeHref(value: string | undefined): string | undefined {
  const href = value?.trim();

  if (!href || !isSafeHref(href)) {
    return undefined;
  }

  return href;
}

function isSafeHref(href: string): boolean {
  if (hasUnsafeHrefCharacter(href) || hasSensitiveHrefParameters(href)) {
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

function hasSensitiveHrefParameters(value: string): boolean {
  return Array.from(value.matchAll(hrefParameterPattern)).some((match) =>
    isSensitiveHrefParameterKey(readDecodedParameterKey(match[1] ?? "")),
  );
}

function readDecodedParameterKey(key: string): string {
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
}

function isSensitiveHrefParameterKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return (
    normalized.startsWith("xamz") ||
    sensitiveHrefParameterKeys.has(normalized) ||
    sensitiveHrefParameterKeySuffixes.some((suffix) =>
      normalized.endsWith(suffix),
    )
  );
}
