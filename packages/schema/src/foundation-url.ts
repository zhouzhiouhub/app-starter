import { z } from "zod";
import { mediaAssetReferenceSchema } from "./media-reference.js";

const unsafeHrefCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);
const sensitiveUrlParameterKeySuffixes = [
  "accesstoken",
  "apikey",
  "authcode",
  "authorizationcode",
  "clientsecret",
  "codeverifier",
  "credential",
  "cookie",
  "databaseurl",
  "dsn",
  "idtoken",
  "jwt",
  "keypairid",
  "oauthcode",
  "oauthverifier",
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
const sensitiveUrlParameterKeys = new Set([
  "policy",
  "sig",
  ...sensitiveUrlParameterKeySuffixes,
]);
const urlParameterPattern = /(?:^|[?&#;])([^=\s&#;]+)=/g;

export function isSafeHref(value: string): boolean {
  const href = value.trim();

  if (!href || hasUnsafeHrefCharacter(href) || hasSensitiveUrlParameters(href)) {
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

export const safeHrefSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isSafeHref, {
    message: "Href must be relative, http(s), mailto, tel, or hash",
  });
export type SafeHref = z.infer<typeof safeHrefSchema>;

export const seoUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isSeoUrl, {
    message: "SEO URL must be relative or http(s)",
  });
export type SeoUrl = z.infer<typeof seoUrlSchema>;

export const seoImageUrlSchema = z.union([
  seoUrlSchema,
  mediaAssetReferenceSchema,
]);
export type SeoImageUrl = z.infer<typeof seoImageUrlSchema>;

export function isSeoUrl(value: string): boolean {
  const url = value.trim();

  if (!url || hasUnsafeHrefCharacter(url)) {
    return false;
  }

  if (url.startsWith("/")) {
    return (
      !url.startsWith("//") &&
      !hasSensitiveRelativeSeoQueryParameters(url)
    );
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        Boolean(parsed.hostname) &&
        !parsed.username &&
        !parsed.password &&
        !hasSensitiveSeoQueryParameters(parsed)
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

function hasSensitiveSeoQueryParameters(url: URL): boolean {
  return Array.from(url.searchParams.keys()).some(isSensitiveUrlParameterKey);
}

function hasSensitiveRelativeSeoQueryParameters(value: string): boolean {
  try {
    return hasSensitiveSeoQueryParameters(
      new URL(value, "https://example.invalid"),
    );
  } catch {
    return true;
  }
}

export function hasSensitiveUrlParameters(value: string): boolean {
  return Array.from(value.matchAll(urlParameterPattern)).some((match) =>
    isSensitiveUrlParameterKey(readDecodedParameterKey(match[1] ?? "")),
  );
}

function readDecodedParameterKey(key: string): string {
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
}

function isSensitiveUrlParameterKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return (
    normalized.startsWith("xamz") ||
    sensitiveUrlParameterKeys.has(normalized) ||
    sensitiveUrlParameterKeySuffixes.some((suffix) =>
      normalized.endsWith(suffix),
    )
  );
}
