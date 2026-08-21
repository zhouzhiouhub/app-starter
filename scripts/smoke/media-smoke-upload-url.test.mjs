import assert from "node:assert/strict";
import test from "node:test";
import {
  isR2UploadUrl,
  isR2UploadUrlForKey,
} from "./media-smoke.mjs";
import { r2UploadUrl } from "./media-smoke-test-helpers.mjs";

test("smoke helpers detect R2 upload URLs", () => {
  assert.equal(isR2UploadUrl(r2UploadUrl("/bucket/key")), true);
  assert.equal(
    isR2UploadUrl(r2UploadUrl("/key", "https://uploads.example.com")),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      r2UploadUrl("/bucket/key", "http://account.r2.cloudflarestorage.com"),
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      r2UploadUrl(
        "/bucket/key",
        "https://user:pass@account.r2.cloudflarestorage.com",
      ),
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=access%2F20260819%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260819T000000Z&X-Amz-Expires=0&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=access%2F20260819%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260819T000000Z&X-Amz-Expires=901&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(isR2UploadUrl("not-a-url"), false);
});

test("smoke helpers match R2 upload URLs to object keys", () => {
  assert.equal(
    isR2UploadUrlForKey(
      r2UploadUrl("/bucket/tenant/2026/08/19/smoke%20image.png"),
      "tenant/2026/08/19/smoke image.png",
    ),
    true,
  );
  assert.equal(
    isR2UploadUrlForKey(
      r2UploadUrl("/bucket/tenant/2026/08/19/other.png"),
      "tenant/2026/08/19/smoke.png",
    ),
    false,
  );
  assert.equal(
    isR2UploadUrlForKey(
      r2UploadUrl(
        "/tenant/2026/08/19/smoke.png",
        "https://uploads.example.com",
      ),
      "tenant/2026/08/19/smoke.png",
    ),
    false,
  );
});
