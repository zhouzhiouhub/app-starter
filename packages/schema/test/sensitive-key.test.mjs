import assert from "node:assert/strict";
import test from "node:test";
import {
  isSensitiveSecretLikeKey,
  isSensitiveUrlParameterKey,
  normalizeSensitiveKey,
  sensitiveCredentialKeyPatternSource,
  sensitiveUrlParameterKeyPatternSource,
} from "../dist/index.js";

test("sensitive key helpers normalize separators and casing", () => {
  assert.equal(normalizeSensitiveKey(" Authorization-Code "), "authorizationcode");
  assert.equal(normalizeSensitiveKey("code_verifier"), "codeverifier");
});

test("sensitive URL parameter helper catches credential and signed URL keys", () => {
  for (const key of [
    "authorization_code",
    "codeVerifier",
    "Key-Pair-Id",
    "X-Amz-Signature",
    "Policy",
    "sig",
    "cdn_access_token",
  ]) {
    assert.equal(isSensitiveUrlParameterKey(key), true, key);
  }

  assert.equal(isSensitiveUrlParameterKey("utm_source"), false);
  assert.equal(isSensitiveUrlParameterKey("policyTitle"), false);
});

test("sensitive secret helper avoids URL-only policy keys", () => {
  for (const key of [
    "authorization",
    "clientSecret",
    "oauth_verifier",
    "storefrontRevalidateSecret",
    "secretAccessKey",
    "sentryDsn",
    "stripeWebhookSignature",
    "x-amz-credential",
    "uploadSig",
  ]) {
    assert.equal(isSensitiveSecretLikeKey(key), true, key);
  }

  assert.equal(isSensitiveSecretLikeKey("policy"), false);
  assert.equal(isSensitiveSecretLikeKey("pageTitle"), false);
});

test("sensitive regex sources separate URL-only query parameters", () => {
  const secretPattern = new RegExp(`^(?:${sensitiveCredentialKeyPatternSource})$`, "i");
  const urlPattern = new RegExp(`^(?:${sensitiveUrlParameterKeyPatternSource})$`, "i");

  assert.equal(secretPattern.test("authorizationCode"), true);
  assert.equal(secretPattern.test("secretAccessKey"), true);
  assert.equal(secretPattern.test("storefrontRevalidateSecret"), true);
  assert.equal(secretPattern.test("stripeWebhookSignature"), true);
  assert.equal(urlPattern.test("Key-Pair-Id"), true);
  assert.equal(urlPattern.test("storefrontRevalidateSecret"), true);
  assert.equal(secretPattern.test("policy"), false);
  assert.equal(urlPattern.test("authorization_code"), true);
  assert.equal(urlPattern.test("Policy"), true);
});
