import assert from "node:assert/strict";
import test from "node:test";
import { ImageGallery } from "../dist/index.js";

test("image gallery renders valid images lazily", () => {
  const gallery = ImageGallery({
    images: [{ alt: "Product", src: "https://cdn.example.com/product.jpg" }],
  });
  const image = gallery.props.children[0];

  assert.equal(image.type, "img");
  assert.equal(image.props.alt, "Product");
  assert.equal(image.props.src, "https://cdn.example.com/product.jpg");
  assert.equal(image.props.decoding, "async");
  assert.equal(image.props.loading, "lazy");
});

test("image gallery keeps placeholders for unresolved media references", () => {
  const gallery = ImageGallery({
    images: [{ alt: "Hero", src: "media://asset-missing" }],
  });
  const placeholder = gallery.props.children[0];

  assert.equal(placeholder.type, "div");
  assert.equal(placeholder.props["data-gallery-image-missing"], "unresolved-media");
  assert.equal(placeholder.props["data-media-reference"], "media://asset-missing");
  assert.equal(placeholder.props.role, "img");
  assert.equal(placeholder.props["aria-label"], "Hero");
});

test("image gallery keeps placeholders for blank image rows", () => {
  const gallery = ImageGallery({
    images: [{ src: "  " }],
  });
  const placeholder = gallery.props.children[0];

  assert.equal(placeholder.type, "div");
  assert.equal(placeholder.props["data-gallery-image-missing"], "empty-src");
  assert.equal(placeholder.props["data-media-reference"], undefined);
});

test("image gallery blocks unsafe image source protocols", () => {
  const gallery = ImageGallery({
    images: [
      { alt: "HTTP", src: "http://cdn.example.com/product.jpg" },
      { alt: "Bad protocol", src: "javascript:alert(1)" },
      { alt: "Inline SVG", src: "data:image/svg+xml,<svg onload=alert(1)>" },
    ],
  });

  for (const placeholder of gallery.props.children) {
    assert.equal(placeholder.type, "div");
    assert.equal(placeholder.props["data-gallery-image-missing"], "unsafe-src");
  }
});

test("image gallery blocks image sources with control characters", () => {
  const gallery = ImageGallery({
    images: [{ src: "https://example.com/image.jpg\njavascript:alert(1)" }],
  });
  const placeholder = gallery.props.children[0];

  assert.equal(placeholder.type, "div");
  assert.equal(placeholder.props["data-gallery-image-missing"], "unsafe-src");
  assert.equal(
    placeholder.props["data-media-reference"],
    "https://example.com/image.jpg\njavascript:alert(1)",
  );
});

test("image gallery keeps placeholders for non-string image values", () => {
  const gallery = ImageGallery({
    images: [{ alt: "Numeric", src: 123 }],
  });
  const placeholder = gallery.props.children[0];

  assert.equal(placeholder.type, "div");
  assert.equal(placeholder.props["data-gallery-image-missing"], "empty-src");
  assert.equal(placeholder.props["aria-label"], "Numeric");
});
