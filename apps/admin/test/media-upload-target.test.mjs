import assert from "node:assert/strict";
import test from "node:test";
import { MEDIA_MAX_UPLOAD_BYTES } from "../src/features/media/constants.ts";
import { createMediaUploadUrl } from "../src/features/media/api.ts";
import { readMediaUploadTargetResponse } from "../src/features/media/media-upload-target.ts";

const validTarget = {
  confirmPath: "/api/v1/media/confirm",
  expiresAt: "2026-08-23T00:15:00.000Z",
  headers: {
    "Content-Type": "image/webp",
  },
  maxSize: MEDIA_MAX_UPLOAD_BYTES,
  method: "PUT",
  r2Key: "tenant-1/2026/08/23/asset.webp",
  type: "image",
  uploadUrl:
    "https://uploads.example.com/asset.webp?X-Amz-Credential=credential-value&X-Amz-Signature=signed-value",
};

test("media upload target reader accepts signed HTTPS and local HTTP targets", () => {
  assert.deepEqual(readMediaUploadTargetResponse(validTarget), validTarget);
  assert.equal(
    readMediaUploadTargetResponse({
      ...validTarget,
      uploadUrl: " http://localhost:4000/upload/asset.webp ",
    }).uploadUrl,
    "http://localhost:4000/upload/asset.webp",
  );
  assert.equal(
    readMediaUploadTargetResponse({
      ...validTarget,
      uploadUrl: "http://127.0.0.1:4000/upload/asset.webp",
    }).uploadUrl,
    "http://127.0.0.1:4000/upload/asset.webp",
  );
});

test("media upload target reader rejects unsafe upload targets", () => {
  for (const data of [
    null,
    {},
    { ...validTarget, confirmPath: "https://api.example.com/media/confirm" },
    { ...validTarget, expiresAt: " soon " },
    { ...validTarget, headers: { Authorization: "Bearer token" } },
    { ...validTarget, headers: { "Content-Type": "image/png\nx: y" } },
    { ...validTarget, headers: { "X-Empty": "" } },
    { ...validTarget, headers: { ["X-".padEnd(129, "A")]: "value" } },
    { ...validTarget, headers: { "X-Long": "a".repeat(1025) } },
    { ...validTarget, headers: readHeadersWithSpecialName() },
    {
      ...validTarget,
      headers: Object.fromEntries(
        Array.from({ length: 17 }, (_, index) => [`X-Test-${index}`, "value"]),
      ),
    },
    { ...validTarget, maxSize: MEDIA_MAX_UPLOAD_BYTES + 1 },
    { ...validTarget, method: "POST" },
    { ...validTarget, r2Key: "tenant-1/key\nx" },
    { ...validTarget, type: "script" },
    { ...validTarget, uploadUrl: "ftp://uploads.example.com/asset.webp" },
    { ...validTarget, uploadUrl: "http://uploads.example.com/asset.webp" },
    {
      ...validTarget,
      uploadUrl: "https://user:password@uploads.example.com/asset.webp",
    },
    { ...validTarget, uploadUrl: "https://uploads.example.com/asset.webp#sig" },
    {
      ...validTarget,
      uploadUrl: "https://uploads.example.com/asset.webp\njavascript:alert(1)",
    },
  ]) {
    assert.throws(
      () => readMediaUploadTargetResponse(data),
      /Upload URL could not be prepared/,
    );
  }
});

test("media upload API validates upload target responses before use", async () => {
  await withFetch(
    async () => jsonResponse({ data: validTarget }),
    async () => {
      assert.deepEqual(
        await createMediaUploadUrl({
          filename: "asset.webp",
          mimeType: "image/webp",
          size: 1024,
        }),
        validTarget,
      );
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        data: {
          ...validTarget,
          method: "DELETE",
          uploadUrl: "https://uploads.example.com/asset.webp",
        },
      }),
    async () => {
      await assert.rejects(
        () =>
          createMediaUploadUrl({
            filename: "asset.webp",
            mimeType: "image/webp",
            size: 1024,
          }),
        /Upload URL could not be prepared/,
      );
    },
  );
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function readHeadersWithSpecialName() {
  return Object.fromEntries([["__proto__", "polluted"]]);
}

async function withFetch(fetchImplementation, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}
