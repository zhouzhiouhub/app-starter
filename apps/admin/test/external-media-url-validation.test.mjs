import assert from "node:assert/strict";
import test from "node:test";
import { readExternalMediaUrlError } from "../src/features/media/external-media-url-validation.ts";

test("external media URL validation accepts https URLs", () => {
  assert.equal(
    readExternalMediaUrlError("https://assets.brand-platform.com/hero.webp"),
    null,
  );
});

test("external media URL validation rejects invalid protocols", () => {
  assert.match(
    readExternalMediaUrlError("http://assets.brand-platform.com/hero.webp") ??
      "",
    /https/,
  );
  assert.match(
    readExternalMediaUrlError("file:///tmp/hero.webp") ?? "",
    /https/,
  );
  assert.match(
    readExternalMediaUrlError("javascript:alert(1)") ?? "",
    /https/,
  );
});

test("external media URL validation rejects embedded credentials", () => {
  assert.match(
    readExternalMediaUrlError(
      "https://user:pass@assets.brand-platform.com/hero.webp",
    ) ?? "",
    /username or password/,
  );
});

test("external media URL validation rejects fragments and sensitive query parameters", () => {
  assert.match(
    readExternalMediaUrlError(
      "https://assets.brand-platform.com/hero.webp#access_token=secret",
    ) ?? "",
    /fragments/,
  );
  assert.match(
    readExternalMediaUrlError(
      "https://assets.brand-platform.com/hero.webp?X-Amz-Signature=signed",
    ) ?? "",
    /credential or token/,
  );
  assert.match(
    readExternalMediaUrlError(
      "https://assets.brand-platform.com/hero.webp?Policy=signed-policy",
    ) ?? "",
    /credential or token/,
  );
  assert.match(
    readExternalMediaUrlError(
      "https://assets.brand-platform.com/hero.webp?authorization_code=oauth-code",
    ) ?? "",
    /credential or token/,
  );
  assert.match(
    readExternalMediaUrlError(
      "https://assets.brand-platform.com/hero.webp?code_verifier=pkce-secret",
    ) ?? "",
    /credential or token/,
  );
});

test("external media URL validation rejects placeholder and private hosts", () => {
  for (const value of [
    "https://cdn.example.com/hero.webp",
    "https://assets.test/hero.webp",
    "https://localhost/hero.webp",
    "https://10.0.0.1/hero.webp",
    "https://192.0.2.10/hero.webp",
    "https://[::1]/hero.webp",
  ]) {
    assert.match(readExternalMediaUrlError(value) ?? "", /public production/);
  }
});
