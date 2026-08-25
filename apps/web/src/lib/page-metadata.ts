import type { Metadata } from "next";
import {
  getStorefrontHref,
  isPublishableImageSrc,
  mediaAssetReferenceSchema,
  seoImageUrlSchema,
  seoUrlSchema,
  type PageSchema,
} from "@app-starter/schema";
import { readSafePublicOrigin } from "./safe-public-origin.ts";

export type PageMetadataOptions = {
  origin?: string;
};

export function buildPageMetadata(
  schema: PageSchema | null,
  options: PageMetadataOptions = {},
): Metadata {
  if (!schema) {
    return {
      robots: createRobots(true),
      title: "App Starter",
    };
  }

  const title = schema.seo.title || schema.meta.title;
  const description = schema.seo.description || undefined;
  const origin = readMetadataOrigin(options.origin);
  const canonical = readResolvedCanonical(schema, origin);
  const ogImage = readResolvedSeoImage(schema.seo.ogImage, origin);

  return {
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    description,
    openGraph: {
      description,
      images: ogImage ? [ogImage] : undefined,
      title,
      url: canonical,
    },
    robots: createRobots(schema.seo.noIndex),
    title,
  };
}

function readResolvedCanonical(
  schema: PageSchema,
  origin: string | undefined,
): string | undefined {
  const canonical = seoUrlSchema.safeParse(schema.seo.canonical);
  const fallback = resolveSeoUrl(
    getStorefrontHref(schema.meta.locale, schema.meta.slug),
    origin,
  );

  if (!canonical.success) {
    return fallback;
  }

  return resolveCanonicalUrl(canonical.data, origin) ?? fallback;
}

function readResolvedSeoImage(
  value: string | undefined,
  origin: string | undefined,
): string | undefined {
  const src = value?.trim();

  if (!src || mediaAssetReferenceSchema.safeParse(src).success) {
    return undefined;
  }

  return seoImageUrlSchema.safeParse(src).success && isPublishableImageSrc(src)
    ? resolveSeoUrl(src, origin)
    : undefined;
}

function createRobots(noIndex: boolean): Metadata["robots"] {
  if (noIndex) {
    return {
      follow: false,
      index: false,
    };
  }

  return {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  };
}

function resolveSeoUrl(value: string, origin: string | undefined): string {
  return origin && value.startsWith("/") ? `${origin}${value}` : value;
}

function resolveCanonicalUrl(
  value: string,
  origin: string | undefined,
): string | undefined {
  if (value.startsWith("/")) {
    return resolveSeoUrl(value, origin);
  }

  return hasSafeAbsoluteOrigin(value) ? value : undefined;
}

function hasSafeAbsoluteOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return readSafePublicOrigin(url.origin) !== null;
  } catch {
    return false;
  }
}

function readMetadataOrigin(value: string | undefined): string | undefined {
  return readSafePublicOrigin(value) ?? undefined;
}
