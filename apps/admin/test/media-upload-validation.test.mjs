import assert from "node:assert/strict";
import test from "node:test";
import {
  MEDIA_MAX_UPLOAD_BYTES,
  readMediaUploadFileError,
} from "../src/features/media/media-upload-validation.ts";

test("media upload validation accepts allowed files within size limits", () => {
  assert.equal(
    readMediaUploadFileError({
      name: "hero.webp",
      size: 1024,
      type: "image/webp",
    }),
    null,
  );
});

test("media upload validation rejects unsupported file types", () => {
  assert.match(
    readMediaUploadFileError({
      name: "hero.svg",
      size: 1024,
      type: "image/svg+xml",
    }) ?? "",
    /not allowed/,
  );
});

test("media upload validation rejects empty and oversized files", () => {
  assert.match(
    readMediaUploadFileError({
      name: "empty.png",
      size: 0,
      type: "image/png",
    }) ?? "",
    /empty/,
  );
  assert.match(
    readMediaUploadFileError({
      name: "large.mp4",
      size: MEDIA_MAX_UPLOAD_BYTES + 1,
      type: "video/mp4",
    }) ?? "",
    /25 MB/,
  );
});
