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
