import type { ReactNode } from "react";
import { readSafeImageSrc } from "../safe-image-src.js";

export function ImageGallery(props: {
  images?: Array<{ src: string; alt?: string }>;
}): ReactNode {
  const images = props.images ?? [];

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3 md:px-10">
      {images.map((image, index) => {
        const rawSrc = image.src.trim();
        const src = readSafeImageSrc(rawSrc);

        if (!src) {
          return (
            <div
              aria-label={image.alt?.trim() || "Missing gallery image"}
              className="aspect-[4/3] w-full rounded-md border border-dashed border-gray-300 bg-gray-100"
              data-gallery-image-missing={readMissingImageReason(rawSrc)}
              data-media-reference={rawSrc || undefined}
              key={`missing-${index}-${rawSrc}`}
              role="img"
            />
          );
        }

        return (
          <img
            alt={image.alt ?? ""}
            className="aspect-[4/3] w-full rounded-md object-cover"
            decoding="async"
            key={`${index}-${src}`}
            loading="lazy"
            src={src}
          />
        );
      })}
    </section>
  );
}

function readMissingImageReason(src: string): "empty-src" | "unresolved-media" | "unsafe-src" {
  if (!src) {
    return "empty-src";
  }

  if (src.startsWith("media://")) {
    return "unresolved-media";
  }

  return "unsafe-src";
}
