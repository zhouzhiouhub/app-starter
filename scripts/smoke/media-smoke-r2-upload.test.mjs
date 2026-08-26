import assert from "node:assert/strict";
import test from "node:test";
import { uploadSmokeImage } from "./media-smoke-r2-upload.mjs";
import { r2UploadUrl } from "./media-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

const image = {
  body: Buffer.from("smoke-image"),
};

const target = {
  headers: { "Content-Type": "image/png" },
  method: "PUT",
  uploadUrl: r2UploadUrl("/bucket/tenant-1/smoke.png"),
};

test("R2 smoke upload disables automatic redirects", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    return new Response("", {
      status: 200,
      statusText: "OK",
    });
  }, async () => {
    await uploadSmokeImage(target, image);
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, target.uploadUrl);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[0].init.headers["Content-Type"], "image/png");
});

test("R2 smoke upload reports redacted redirect targets", async () => {
  let bodyCanceled = false;

  await withFetch(async () => {
    return {
      body: {
        async cancel() {
          bodyCanceled = true;
        },
      },
      headers: new Headers({
        Location:
          "https://storage.example.com/login?token=header.payload.signature&X-Amz-Signature=abc123",
      }),
      ok: false,
      status: 302,
      statusText: "Found",
      async text() {
        throw new Error("redirect response bodies should not be read");
      },
    };
  }, async () => {
    await assert.rejects(
      () => uploadSmokeImage(target, image),
      (error) => {
        assert.match(error.message, /R2 object upload failed\. 302: Found/);
        assert.match(error.message, /redirect:/);
        assert.match(error.message, /token=\[redacted\]/);
        assert.match(error.message, /X-Amz-Signature=\[redacted\]/i);
        assert.equal(error.message.includes("header.payload.signature"), false);
        assert.equal(error.message.includes("abc123"), false);
        return true;
      },
    );
  });

  assert.equal(bodyCanceled, true);
});

test("R2 smoke upload reports oversized error bodies safely", async () => {
  await withFetch(async () => {
    return {
      headers: new Headers({ "Content-Length": "1000001" }),
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      async text() {
        throw new Error("oversized upload error bodies should not be read");
      },
    };
  }, async () => {
    await assert.rejects(
      () => uploadSmokeImage(target, image),
      (error) => {
        assert.match(error.message, /R2 object upload failed\. 500/);
        assert.match(error.message, /body read error:/);
        assert.match(error.message, /X-Amz-Signature=\[redacted\]/i);
        assert.equal(error.message.includes("abc123"), false);
        assert.equal(error.message.includes("access%2F20260819"), false);
        return true;
      },
    );
  });
});

test("R2 smoke upload redacts failure bodies before truncating", async () => {
  await withFetch(async () => {
    return new Response(
      [
        "rawPem=-----BEGIN PRIVATE KEY-----",
        "private-key-body-secret",
        "x".repeat(180),
        "-----END PRIVATE KEY-----",
      ].join("\n"),
      {
        status: 500,
        statusText: "Internal Server Error",
      },
    );
  }, async () => {
    await assert.rejects(
      () => uploadSmokeImage(target, image),
      (error) => {
        assert.match(error.message, /R2 object upload failed\. 500/);
        assert.match(error.message, /rawPem=\[redacted-pem\]/);
        assert.equal(error.message.includes("private-key-body-secret"), false);
        return true;
      },
    );
  });
});
