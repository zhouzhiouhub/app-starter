import type { Metadata } from "next";
import {
  getStorefrontHref,
  isPublishableImageSrc,
  mediaAssetReferenceSchema,
  seoUrlSchema,
  type PageSchema,
} from "@app-starter/schema";

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

  return resolveSeoUrl(
    canonical.success
      ? canonical.data
      : getStorefrontHref(schema.meta.locale, schema.meta.slug),
    origin,
  );
}

function readResolvedSeoImage(
  value: string | undefined,
  origin: string | undefined,
): string | undefined {
  const src = value?.trim();

  if (!src || mediaAssetReferenceSchema.safeParse(src).success) {
    return undefined;
  }

  return isPublishableImageSrc(src) ? resolveSeoUrl(src, origin) : undefined;
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

function readMetadataOrigin(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}
