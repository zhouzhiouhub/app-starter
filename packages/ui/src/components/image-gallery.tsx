import type { ReactNode } from "react";
import { readSafeImageSrc } from "../safe-image-src.js";
import { storefrontShellClassName } from "../storefront-shell.js";

export function ImageGallery(props: {
  images?: Array<{ src?: unknown; alt?: unknown }>;
}): ReactNode {
  const images = props.images ?? [];

  return (
    <section
      className={`${storefrontShellClassName} grid gap-4 py-12 md:grid-cols-3`}
    >
      {images.map((image, index) => {
        const rawSrc = typeof image.src === "string" ? image.src.trim() : "";
        const src = readSafeImageSrc(rawSrc);
        const alt = typeof image.alt === "string" ? image.alt : "";
        const missingReason = readMissingImageReason(rawSrc);

        if (!src) {
          return (
            <div
              aria-label={alt.trim() || "Missing gallery image"}
              className="aspect-[4/3] w-full rounded-md border border-dashed border-gray-300 bg-gray-100"
              data-gallery-image-missing={missingReason}
              data-media-reference={
                missingReason === "unresolved-media" ? rawSrc : undefined
              }
              key={`missing-${index}-${rawSrc}`}
              role="img"
            />
          );
        }

        return (
          <img
            alt={alt}
            className="aspect-[4/3] w-full rounded-md object-cover"
            decoding="async"
            key={`${index}-${src}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            src={src}
          />
        );
      })}
    </section>
  );
}

function readMissingImageReason(
  src: string,
): "empty-src" | "unresolved-media" | "unsafe-src" {
  if (!src) {
    return "empty-src";
  }

  if (src.startsWith("media://")) {
    return "unresolved-media";
  }

  return "unsafe-src";
}
