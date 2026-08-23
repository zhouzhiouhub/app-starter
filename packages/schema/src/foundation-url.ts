import { z } from "zod";
import { mediaAssetReferenceSchema } from "./media-reference.js";

const unsafeHrefCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);
const sensitiveSeoQueryKeySuffixes = [
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
const sensitiveSeoQueryKeys = new Set([
  "policy",
  "sig",
  ...sensitiveSeoQueryKeySuffixes,
]);

export function isSafeHref(value: string): boolean {
  const href = value.trim();

  if (!href || hasUnsafeHrefCharacter(href)) {
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
  return Array.from(url.searchParams.keys()).some(isSensitiveSeoQueryKey);
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

function isSensitiveSeoQueryKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return (
    normalized.startsWith("xamz") ||
    sensitiveSeoQueryKeys.has(normalized) ||
    sensitiveSeoQueryKeySuffixes.some((suffix) => normalized.endsWith(suffix))
  );
}
