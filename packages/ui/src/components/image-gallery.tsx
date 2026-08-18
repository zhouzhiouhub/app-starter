import type { ReactNode } from "react";

export function ImageGallery(props: {
  images?: Array<{ src: string; alt?: string }>;
}): ReactNode {
  const images = props.images ?? [];

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3 md:px-10">
      {images.map((image) => (
        <img
          alt={image.alt ?? ""}
          className="aspect-[4/3] w-full rounded-md object-cover"
          key={image.src}
          src={image.src}
        />
      ))}
    </section>
  );
}
