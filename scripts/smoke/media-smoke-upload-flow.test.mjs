import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeMediaAsset } from "./media-smoke-upload-flow.mjs";
import { r2UploadUrl } from "./media-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("media smoke upload flow sends idempotency keys for write requests", async () => {
  const calls = [];
  let confirmedAsset = null;

  await withFetch(async (url, init = {}) => {
    calls.push({
      headers: init.headers ?? {},
      method: init.method ?? "GET",
      url,
    });

    if (url.endsWith("/media/upload-url")) {
      return jsonResponse({
        data: {
          confirmPath: "/api/v1/media/confirm",
          expiresAt: "2026-08-21T00:15:00.000Z",
          headers: { "Content-Type": "image/png" },
          maxSize: 26214400,
          method: "PUT",
          r2Key: "tenant-1/2026/08/21/smoke.png",
          type: "image",
          uploadUrl: "https://uploads.local.invalid/tenant-1/2026/08/21/smoke.png",
        },
      });
    }

    if (url.endsWith("/media/confirm")) {
      const body = JSON.parse(init.body);
      confirmedAsset = {
        filename: body.filename,
        id: "asset-1",
        mimeType: body.mimeType,
        r2Key: body.r2Key,
        reference: "media://asset-1",
        size: body.size,
        status: "active",
        type: "image",
        url: `https://cdn.example.com/${body.r2Key}`,
      };

      return jsonResponse({
        data: confirmedAsset,
      });
    }

    if (url.startsWith("https://api.example.com/media?")) {
      return jsonResponse({
        data: [confirmedAsset],
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }, async () => {
    await createSmokeMediaAsset(
      {
        apiBaseUrl: "https://api.example.com",
        requireR2Upload: false,
      },
      "access-token",
    );
  });

  const [uploadTarget, confirm, list] = calls;

  assert.equal(uploadTarget.method, "POST");
  assert.match(uploadTarget.headers["Idempotency-Key"], uuidPattern);
  assert.equal(confirm.method, "POST");
  assert.match(confirm.headers["Idempotency-Key"], uuidPattern);
  assert.notEqual(
    uploadTarget.headers["Idempotency-Key"],
    confirm.headers["Idempotency-Key"],
  );
  assert.equal(list.method, "GET");
  assert.equal(calls.length, 3);
});

test("media smoke upload flow uploads the object when R2 upload is required", async () => {
  const calls = [];
  let confirmedAsset = null;
  const r2Key = "tenant-1/2026/08/21/smoke.png";

  await withFetch(async (url, init = {}) => {
    calls.push({
      headers: init.headers ?? {},
      method: init.method ?? "GET",
      url,
    });

    if (url.endsWith("/media/upload-url")) {
      return jsonResponse({
        data: {
          confirmPath: "/api/v1/media/confirm",
          expiresAt: "2026-08-21T00:15:00.000Z",
          headers: { "Content-Type": "image/png" },
          maxSize: 26214400,
          method: "PUT",
          r2Key,
          type: "image",
          uploadUrl: r2UploadUrl(`/bucket/${r2Key}`),
        },
      });
    }

    if (url === r2UploadUrl(`/bucket/${r2Key}`)) {
      assert.equal(init.method, "PUT");
      assert.equal(init.headers["Content-Type"], "image/png");
      return new Response("", { status: 200, statusText: "OK" });
    }

    if (url.endsWith("/media/confirm")) {
      const body = JSON.parse(init.body);
      confirmedAsset = {
        filename: body.filename,
        id: "asset-1",
        mimeType: body.mimeType,
        r2Key: body.r2Key,
        reference: "media://asset-1",
        size: body.size,
        status: "active",
        type: "image",
        url: `https://cdn.brand-assets.com/${body.r2Key}`,
      };

      return jsonResponse({
        data: confirmedAsset,
      });
    }

    if (url.startsWith("https://api.example.com/media?")) {
      return jsonResponse({
        data: [confirmedAsset],
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }, async () => {
    await createSmokeMediaAsset(
      {
        apiBaseUrl: "https://api.example.com",
        requireR2Upload: true,
      },
      "access-token",
    );
  });

  assert.deepEqual(
    calls.map((call) => call.method),
    ["POST", "PUT", "POST", "GET"],
  );
});

test("media smoke upload flow reports CDN diagnostics on confirmation failures", async () => {
  const r2Key = "tenant-1/2026/08/21/smoke.png";

  await withFetch(async (url, init = {}) => {
    if (url.endsWith("/media/upload-url")) {
      return jsonResponse({
        data: {
          confirmPath: "/api/v1/media/confirm",
          expiresAt: "2026-08-21T00:15:00.000Z",
          headers: { "Content-Type": "image/png" },
          maxSize: 26214400,
          method: "PUT",
          r2Key,
          type: "image",
          uploadUrl: r2UploadUrl(`/bucket/${r2Key}`),
        },
      });
    }

    if (url === r2UploadUrl(`/bucket/${r2Key}`)) {
      return new Response("", { status: 200, statusText: "OK" });
    }

    if (url.endsWith("/media/confirm")) {
      const body = JSON.parse(init.body);
      return jsonResponse({
        data: {
          filename: body.filename,
          id: "asset-1",
          mimeType: body.mimeType,
          r2Key: body.r2Key,
          reference: "media://asset-1",
          size: body.size,
          status: "active",
          type: "image",
          url: `https://cdn.example.com/${body.r2Key}`,
        },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }, async () => {
    await assert.rejects(
      () =>
        createSmokeMediaAsset(
          {
            apiBaseUrl: "https://api.example.com",
            requireR2Upload: true,
          },
          "access-token",
        ),
      (error) => {
        assert.match(error.message, /production CDN URL/);
        assert.equal(error.smokeDetails.media.cdnHost, "cdn.example.com");
        assert.equal(error.smokeDetails.media.cdnUrlMatchesR2Key, true);
        assert.equal(error.smokeDetails.media.productionCdn, false);
        assert.equal(error.smokeDetails.media.uploadUrlMatchesR2Key, true);
        assert.equal(error.smokeDetails.media.uploadedObject, true);
        assert.equal("uploadUrl" in error.smokeDetails.media, false);
        assert.equal(
          JSON.stringify(error.smokeDetails).includes("X-Amz-Signature"),
          false,
        );
        return true;
      },
    );
  });
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
  });
}
