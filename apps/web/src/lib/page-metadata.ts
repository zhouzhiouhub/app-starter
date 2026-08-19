import type { Metadata } from "next";
import type { PageSchema } from "@app-starter/schema";

export function buildPageMetadata(schema: PageSchema | null): Metadata {
  if (!schema) {
    return {
      robots: createRobots(true),
      title: "App Starter",
    };
  }

  const title = schema.seo.title || schema.meta.title;
  const description = schema.seo.description || undefined;
  const canonical = schema.seo.canonical || undefined;
  const ogImage = schema.seo.ogImage || undefined;

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
