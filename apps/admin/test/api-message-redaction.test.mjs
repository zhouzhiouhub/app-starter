import assert from "node:assert/strict";
import test from "node:test";
import { redactApiMessageSecrets } from "../src/lib/api-message-redaction.ts";

test("API message redaction removes secrets from JSON-like fragments", () => {
  const message = redactApiMessageSecrets(
    [
      '"accessToken":"header.payload.signature"',
      '"authorization":"Bearer json.header.payload"',
      '"authorizationCode":"oauth-code"',
      '"password":"ChangeMe123!"',
      '"clientSecret":"oauth-client-secret"',
      '"codeVerifier":"pkce-secret"',
      '"databaseUrl":"postgresql://db-user:db-secret@db.example.com/app"',
      '"previewApiUrl":"https://api.example.com/api/v1/public/preview/payload.signature"',
      "'privateKeyPem':'private-key-body'",
      "Authorization: Basic dXNlcjpwYXNz",
      "Authorization=ApiKey admin-api-key-value",
      "secretAccessKey=aws-secret-key",
      "callback=https://auth.example.com/callback?oauth_verifier=oauth-verifier-secret",
      "download=https://cdn.example.com/object?Policy=policy-secret&sig=sig-secret",
      "storefrontRevalidateSecret=storefront-secret",
      "webhookSignature=webhook-signature",
      '"stripeWebhookSignature":"stripe-signature"',
      "rawPem=-----BEGIN PRIVATE KEY-----\nraw-private-key-body\n-----END PRIVATE KEY-----",
    ].join(" "),
  );

  assert.equal(message.includes("header.payload.signature"), false);
  assert.equal(message.includes("json.header.payload"), false);
  assert.equal(message.includes("oauth-code"), false);
  assert.equal(message.includes("oauth-verifier-secret"), false);
  assert.equal(message.includes("policy-secret"), false);
  assert.equal(message.includes("sig-secret"), false);
  assert.equal(message.includes("pkce-secret"), false);
  assert.equal(message.includes("ChangeMe123"), false);
  assert.equal(message.includes("oauth-client-secret"), false);
  assert.equal(message.includes("db-user"), false);
  assert.equal(message.includes("db-secret"), false);
  assert.equal(message.includes("payload.signature"), false);
  assert.equal(message.includes("dXNlcjpwYXNz"), false);
  assert.equal(message.includes("admin-api-key-value"), false);
  assert.equal(message.includes("storefront-secret"), false);
  assert.equal(message.includes("webhook-signature"), false);
  assert.equal(message.includes("stripe-signature"), false);
  assert.equal(message.includes("private-key-body"), false);
  assert.equal(message.includes("aws-secret-key"), false);
  assert.equal(message.includes("raw-private-key-body"), false);
  assert.match(message, /"accessToken":"\[redacted\]"/);
  assert.match(message, /"authorization":"\[redacted\]"/);
  assert.match(message, /"authorizationCode":"\[redacted\]"/);
  assert.match(message, /"codeVerifier":"\[redacted\]"/);
  assert.match(message, /"password":"\[redacted\]"/);
  assert.match(message, /"clientSecret":"\[redacted\]"/);
  assert.match(message, /"databaseUrl":"\[redacted\]"/);
  assert.match(
    message,
    /"previewApiUrl":"https:\/\/api\.example\.com\/api\/v1\/public\/preview\/\[redacted\]"/,
  );
  assert.match(message, /'privateKeyPem':'\[redacted\]'/);
  assert.match(message, /Authorization: Basic \[redacted\]/);
  assert.match(message, /Authorization=ApiKey \[redacted\]/);
  assert.match(message, /secretAccessKey=\[redacted\]/);
  assert.match(message, /oauth_verifier=\[redacted\]/);
  assert.match(message, /Policy=\[redacted\]/);
  assert.match(message, /sig=\[redacted\]/);
  assert.match(message, /storefrontRevalidateSecret=\[redacted\]/);
  assert.match(message, /webhookSignature=\[redacted\]/);
  assert.match(message, /"stripeWebhookSignature":"\[redacted\]"/);
  assert.match(message, /rawPem=\[redacted-pem\]/);
});

test("API message redaction keeps non-secret text readable", () => {
  assert.equal(
    redactApiMessageSecrets("Upstream unavailable for page preview."),
    "Upstream unavailable for page preview.",
  );
});
