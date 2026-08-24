import assert from "node:assert/strict";
import test from "node:test";
import { MEDIA_MAX_UPLOAD_BYTES } from "../src/features/media/constants.ts";
import {
  createMediaUploadUrl,
  uploadMediaFile,
} from "../src/features/media/api.ts";
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

test("media upload API rejects files larger than the prepared target", async () => {
  const requests = [];

  await withFetch(async (url) => {
    requests.push(String(url));

    if (String(url).endsWith("/media/upload-url")) {
      return jsonResponse({ data: { ...validTarget, maxSize: 1024 } });
    }

    throw new Error("unexpected upload request");
  }, async () => {
    await assert.rejects(
      () =>
        uploadMediaFile({
          altText: "Hero image",
          file: {
            name: "asset.webp",
            size: 2048,
            type: "image/webp",
          },
        }),
      /prepared upload size limit/,
    );
  });

  assert.deepEqual(requests, ["/api/v1/media/upload-url"]);
});

test("media direct uploads do not automatically follow redirects", async () => {
  const requests = [];
  const file = {
    name: "asset.webp",
    size: 1024,
    type: "image/webp",
  };
  let uploadBody;

  await withFetch(async (url, init = {}) => {
    requests.push({
      method: init.method,
      path: readRequestPath(String(url)),
      redirect: init.redirect,
    });

    if (String(url).endsWith("/media/upload-url")) {
      return jsonResponse({ data: validTarget });
    }

    if (String(url) === validTarget.uploadUrl) {
      uploadBody = init.body;
      return new Response(null, { status: 204 });
    }

    if (String(url).endsWith("/media/confirm")) {
      return jsonResponse({
        data: {
          id: "asset-1",
        },
      });
    }

    return new Response("", { status: 404 });
  }, async () => {
    assert.deepEqual(
      await uploadMediaFile({
        altText: "Hero image",
        file,
      }),
      { id: "asset-1" },
    );
  });

  assert.equal(uploadBody, file);
  assert.deepEqual(requests, [
    {
      method: "POST",
      path: "/media/upload-url",
      redirect: "manual",
    },
    {
      method: "PUT",
      path: "upload-target",
      redirect: "manual",
    },
    {
      method: "POST",
      path: "/media/confirm",
      redirect: "manual",
    },
  ]);
});

test("media direct uploads cancel response bodies after status checks", async () => {
  const canceledStatuses = [];
  const file = {
    name: "asset.webp",
    size: 1024,
    type: "image/webp",
  };
  let uploadCount = 0;

  await withFetch(async (url) => {
    if (String(url).endsWith("/media/upload-url")) {
      return jsonResponse({ data: validTarget });
    }

    if (String(url) === validTarget.uploadUrl) {
      uploadCount += 1;
      return cancellableResponse(
        uploadCount === 1 ? 201 : 503,
        canceledStatuses,
      );
    }

    if (String(url).endsWith("/media/confirm")) {
      return jsonResponse({
        data: {
          id: `asset-${uploadCount}`,
        },
      });
    }

    return new Response("", { status: 404 });
  }, async () => {
    assert.deepEqual(
      await uploadMediaFile({
        altText: "Hero image",
        file,
      }),
      { id: "asset-1" },
    );

    await assert.rejects(
      () =>
        uploadMediaFile({
          altText: "Hero image",
          file,
        }),
      /Upload failed with status 503/,
    );
  });

  assert.deepEqual(canceledStatuses, [201, 503]);
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function cancellableResponse(status, canceledStatuses) {
  return new Response(
    new ReadableStream({
      cancel() {
        canceledStatuses.push(status);
      },
    }),
    { status },
  );
}

function readHeadersWithSpecialName() {
  return Object.fromEntries([["__proto__", "polluted"]]);
}

function readRequestPath(url) {
  if (url === validTarget.uploadUrl) {
    return "upload-target";
  }

  return url.replace(/^.*\/api\/v1/u, "");
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
