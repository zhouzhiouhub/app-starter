import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiRequestError,
  createApiRequestError,
  formatRequestError,
  readApiErrorMessage,
} from "../src/lib/api-error.ts";

test("API request errors preserve code details and request id", () => {
  const error = createApiRequestError(
    {
      error: {
        code: "VALIDATION_ERROR",
        details: {
          archivedReferences: ["media://old"],
          invalidImageSources: [
            { field: "seo.ogImage", reason: "http_requires_https" },
            {
              field: "sections[0].props.images[0].src",
              reason: "unsafe_protocol",
            },
          ],
          missingReferences: [
            "media://hero",
            "media://gallery",
            "media://spec",
            "media://extra",
          ],
        },
        message:
          "Page image sources must use relative paths, HTTPS image URLs, or media references.",
        requestId: "req_publish_123",
      },
    },
    "Publish request failed.",
  );

  assert.equal(error instanceof ApiRequestError, true);
  assert.equal(error.code, "VALIDATION_ERROR");
  assert.equal(error.requestId, "req_publish_123");

  const formatted = formatRequestError(error);
  assert.match(formatted, /^VALIDATION_ERROR:/);
  assert.match(formatted, /seo\.ogImage \(http_requires_https\)/);
  assert.match(
    formatted,
    /sections\[0\]\.props\.images\[0\]\.src \(unsafe_protocol\)/,
  );
  assert.match(
    formatted,
    /Missing media references: media:\/\/hero, media:\/\/gallery, media:\/\/spec, and 1 more\./,
  );
  assert.match(formatted, /Archived media references: media:\/\/old\./);
  assert.match(formatted, /Request ID: req_publish_123\./);
});

test("API error message reader keeps legacy fallback behavior", () => {
  assert.equal(
    readApiErrorMessage(
      { error: { message: "Cannot publish locale de-DE." } },
      "Publish request failed.",
    ),
    "Cannot publish locale de-DE.",
  );
  assert.equal(
    readApiErrorMessage({}, "Publish request failed."),
    "Publish request failed.",
  );
});

test("API request errors summarize media archive usage details", () => {
  const error = createApiRequestError(
    {
      error: {
        code: "CONFLICT",
        details: {
          usage: [
            {
              pageSlug: "home",
              pageTitle: "Home",
              status: "published",
              version: 4,
            },
            {
              pageSlug: "/launch",
              pageTitle: "Launch",
              status: "draft",
              version: 2,
            },
            {
              pageSlug: "legal/privacy",
              pageTitle: "Privacy Policy",
              status: "published",
              version: 7,
            },
            {
              pageSlug: "extra",
              pageTitle: "Extra",
              status: "draft",
              version: 1,
            },
          ],
        },
        message: "Media asset is still referenced by page versions.",
        requestId: "req_archive_123",
      },
    },
    "Media asset could not be archived.",
  );

  const formatted = formatRequestError(error);

  assert.match(formatted, /^CONFLICT:/);
  assert.match(
    formatted,
    /Referenced by page versions: Home \(\/home\) v4 published, Launch \(\/launch\) v2 draft, Privacy Policy \(\/legal\/privacy\) v7 published, and 1 more\./,
  );
  assert.match(formatted, /Request ID: req_archive_123\./);
});
