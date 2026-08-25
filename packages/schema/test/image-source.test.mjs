import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPublishableImageSrcIssues,
  createFallbackPage,
  isPublishableImageSrc,
} from "../dist/index.js";

test("publishable image source helper accepts relative, HTTPS, and media references", () => {
  assert.equal(isPublishableImageSrc("/images/gallery.jpg"), true);
  assert.equal(isPublishableImageSrc("https://cdn.example.com/gallery.jpg"), true);
  assert.equal(isPublishableImageSrc("media://asset-1"), true);
});

test("publishable image source helper rejects HTTP and unsafe values", () => {
  assert.equal(isPublishableImageSrc("http://cdn.example.com/gallery.jpg"), false);
  assert.equal(isPublishableImageSrc("//cdn.example.com/gallery.jpg"), false);
  assert.equal(isPublishableImageSrc("javascript:alert(1)"), false);
  assert.equal(
    isPublishableImageSrc("https://example.com\njavascript:alert(1)"),
    false,
  );
  assert.equal(isPublishableImageSrc("https://user:pass@example.com/og.jpg"), false);
});

test("publishable image source helper rejects sensitive query parameters", () => {
  assert.equal(
    isPublishableImageSrc("https://cdn.example.com/gallery.jpg?token=secret"),
    false,
  );
  assert.equal(
    isPublishableImageSrc(
      "https://cdn.example.com/gallery.jpg?X-Amz-Signature=signed",
    ),
    false,
  );
  assert.equal(isPublishableImageSrc("/images/gallery.jpg?api_key=secret"), false);
});

test("page image source issue collector checks SEO and gallery image fields", () => {
  const schema = createFallbackPage({ slug: "launch", title: "Launch" });

  schema.seo.ogImage = "http://cdn.example.com/og.jpg";
  schema.sections = [
    {
      id: "gallery",
      component: "image-gallery",
      props: {
        images: [
          { alt: "HTTP", src: "http://cdn.example.com/gallery.jpg" },
          { alt: "HTTPS", src: "https://cdn.example.com/gallery-2.jpg" },
          { alt: "Media", src: "media://asset-1" },
          { alt: "Blank", src: "" },
          { alt: "Broken", src: 123 },
          {
            alt: "Signed",
            src: "https://cdn.example.com/signed.jpg?X-Amz-Signature=value",
          },
        ],
      },
      layout: {
        desktop: { x: 0, y: 0, width: 1200 },
        mobile: { x: 0, y: 0, width: 390 },
      },
    },
  ];

  assert.deepEqual(collectPublishableImageSrcIssues(schema), [
    { field: "seo.ogImage", reason: "http_requires_https" },
    {
      field: "sections[0].props.images[0].src",
      reason: "http_requires_https",
    },
    {
      field: "sections[0].props.images[4].src",
      reason: "invalid_image_source",
    },
    {
      field: "sections[0].props.images[5].src",
      reason: "sensitive_query_parameter",
    },
  ]);
});
