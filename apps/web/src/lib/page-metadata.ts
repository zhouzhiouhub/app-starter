import type { Metadata } from "next";
import type { PageSchema } from "@app-starter/schema";

export function buildPageMetadata(schema: PageSchema | null): Metadata {
  if (!schema) {
    return {
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
    title,
  };
}
