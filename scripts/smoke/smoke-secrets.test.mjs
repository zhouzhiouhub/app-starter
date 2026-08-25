import assert from "node:assert/strict";
import test from "node:test";
import { readErrorMessage } from "./smoke-error-message.mjs";
import {
  redactSmokeReportValue,
  redactSmokeSecrets,
} from "./smoke-secrets.mjs";

test("smoke secret redaction removes tokens from common failure shapes", () => {
  const message = redactSmokeSecrets(
    [
      "GET /public/preview/payload.signature?token=payload.signature&secret=shared",
      '"password":"ChangeMe456!"',
      '"accessToken":"header.payload.signature"',
      '"clientSecret":"oauth-client-secret"',
      "Authorization Bearer header.payload.signature",
      "Authorization: Bearer colon.header.payload",
      "Authorization: Basic dXNlcjpwYXNz",
      "Authorization=ApiKey smoke-api-key-value",
      "client_secret=oauth-client-secret-query",
      "databaseUrl=postgresql://db-user:db-secret@db.example.com:5432/app",
      "jwt=header.payload.signature",
      "privateKeyPem=private-key-value",
      "rawPem=-----BEGIN PRIVATE KEY-----\nprivate-key-body\n-----END PRIVATE KEY-----",
      "refreshToken=refresh-token-value",
      "sentryDsn=https://public:dsn-secret@sentry.example.com/1",
      "postgresql://db-user:db-secret@db.example.com:5432/app",
      "redis://cache-user:cache-secret@redis.example.com:6379/0",
      "https://admin-user:admin-secret@admin.example.com",
      "https://web.example.com/preview?preview_token=payload.signature&access_token=access-token-value&api_key=api-key-value",
      "https://auth.example.com/callback#access_token=fragment-access-token&id_token=fragment-id-token",
      "https://cdn.example.com/object.png?sig=edge-signature-value",
      "https://uploads.example.com/object.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=credential-value&X-Amz-Date=20260820T000000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=signature-value&X-Amz-Security-Token=security-token-value",
    ].join(" "),
  );

  assert.equal(message.includes("payload.signature"), false);
  assert.equal(message.includes("colon.header.payload"), false);
  assert.equal(message.includes("dXNlcjpwYXNz"), false);
  assert.equal(message.includes("smoke-api-key-value"), false);
  assert.equal(message.includes("access-token-value"), false);
  assert.equal(message.includes("api-key-value"), false);
  assert.equal(message.includes("fragment-access-token"), false);
  assert.equal(message.includes("fragment-id-token"), false);
  assert.equal(message.includes("ChangeMe456!"), false);
  assert.equal(message.includes("oauth-client-secret"), false);
  assert.equal(message.includes("oauth-client-secret-query"), false);
  assert.equal(message.includes("private-key-value"), false);
  assert.equal(message.includes("private-key-body"), false);
  assert.equal(message.includes("shared"), false);
  assert.equal(message.includes("dsn-secret"), false);
  assert.equal(message.includes("refresh-token-value"), false);
  assert.equal(message.includes("db-user"), false);
  assert.equal(message.includes("db-secret"), false);
  assert.equal(message.includes("cache-user"), false);
  assert.equal(message.includes("cache-secret"), false);
  assert.equal(message.includes("admin-user"), false);
  assert.equal(message.includes("admin-secret"), false);
  assert.equal(message.includes("AWS4-HMAC-SHA256"), false);
  assert.equal(message.includes("credential-value"), false);
  assert.equal(message.includes("20260820T000000Z"), false);
  assert.equal(message.includes("content-type%3Bhost"), false);
  assert.equal(message.includes("edge-signature-value"), false);
  assert.equal(message.includes("signature-value"), false);
  assert.equal(message.includes("security-token-value"), false);
  assert.match(message, /\/public\/preview\/\[redacted\]/);
  assert.match(message, /token=\[redacted\]/);
  assert.match(message, /preview_token=\[redacted\]/);
  assert.match(message, /access_token=\[redacted\]/);
  assert.match(message, /api_key=\[redacted\]/);
  assert.match(message, /#access_token=\[redacted\]/);
  assert.match(message, /id_token=\[redacted\]/);
  assert.match(message, /sig=\[redacted\]/);
  assert.match(message, /"clientSecret":"\[redacted\]"/);
  assert.match(message, /client_secret=\[redacted\]/);
  assert.match(message, /databaseUrl=\[redacted\]/);
  assert.match(message, /jwt=\[redacted\]/);
  assert.match(message, /privateKeyPem=\[redacted\]/);
  assert.match(message, /rawPem=\[redacted-pem\]/);
  assert.match(message, /sentryDsn=\[redacted\]/);
  assert.match(message, /"password":"\[redacted\]"/);
  assert.match(message, /Authorization Bearer \[redacted\]/);
  assert.match(message, /Authorization: Bearer \[redacted\]/);
  assert.match(message, /Authorization: Basic \[redacted\]/);
  assert.match(message, /Authorization=ApiKey \[redacted\]/);
  assert.match(message, /refreshToken=\[redacted\]/);
  assert.match(message, /postgresql:\/\/\[redacted\]@db\.example\.com:5432\/app/);
  assert.match(message, /redis:\/\/\[redacted\]@redis\.example\.com:6379\/0/);
  assert.match(message, /https:\/\/\[redacted\]@admin\.example\.com/);
  assert.match(message, /X-Amz-Algorithm=\[redacted\]/);
  assert.match(message, /X-Amz-Credential=\[redacted\]/);
  assert.match(message, /X-Amz-Date=\[redacted\]/);
  assert.match(message, /X-Amz-Expires=\[redacted\]/);
  assert.match(message, /X-Amz-SignedHeaders=\[redacted\]/);
  assert.match(message, /X-Amz-Signature=\[redacted\]/);
  assert.match(message, /X-Amz-Security-Token=\[redacted\]/);
});

test("smoke CLI error reader redacts secrets", () => {
  assert.equal(
    readErrorMessage(new Error("request failed with token=payload.signature")),
    "request failed with token=[redacted]",
  );
});

test("smoke report value redaction sanitizes nested details", () => {
  assert.deepEqual(
    redactSmokeReportValue({
      attempts: [
        {
          authorization: "Bearer header.payload.signature",
          clientSecret: "oauth-client-secret",
          cookie: "preview_token=payload.signature",
          databaseUrl: "postgresql://db-user:db-secret@db.example.com/app",
          privateKeyPem: "private-key-value",
          sentryDsn: "https://public:dsn-secret@sentry.example.com/1",
          sig: "edge-signature-value",
          uploadUrl:
            "https://uploads.example.com/object.png?sig=upload-signature-value&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=signature-value",
        },
      ],
      ok: true,
      requestUrl:
        "https://web.example.com/preview?preview_token=payload.signature&api_key=api-key-value",
      redirectUrl:
        "https://auth.example.com/callback#access_token=fragment-access-token&id_token=fragment-id-token",
      previewToken: "payload.signature",
    }),
    {
      attempts: [
        {
          authorization: "[redacted]",
          clientSecret: "[redacted]",
          cookie: "[redacted]",
          databaseUrl: "[redacted]",
          privateKeyPem: "[redacted]",
          sentryDsn: "[redacted]",
          sig: "[redacted]",
          uploadUrl:
            "https://uploads.example.com/object.png?sig=[redacted]&X-Amz-Algorithm=[redacted]&X-Amz-Signature=[redacted]",
        },
      ],
      ok: true,
      requestUrl:
        "https://web.example.com/preview?preview_token=[redacted]&api_key=[redacted]",
      redirectUrl:
        "https://auth.example.com/callback#access_token=[redacted]&id_token=[redacted]",
      previewToken: "[redacted]",
    },
  );
});
