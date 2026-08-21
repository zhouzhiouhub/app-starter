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
      "Authorization Bearer header.payload.signature",
      "refreshToken=refresh-token-value",
      "https://web.example.com/preview?preview_token=payload.signature&access_token=access-token-value&api_key=api-key-value",
      "https://uploads.example.com/object.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=credential-value&X-Amz-Date=20260820T000000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=signature-value&X-Amz-Security-Token=security-token-value",
    ].join(" "),
  );

  assert.equal(message.includes("payload.signature"), false);
  assert.equal(message.includes("access-token-value"), false);
  assert.equal(message.includes("api-key-value"), false);
  assert.equal(message.includes("ChangeMe456!"), false);
  assert.equal(message.includes("shared"), false);
  assert.equal(message.includes("refresh-token-value"), false);
  assert.equal(message.includes("AWS4-HMAC-SHA256"), false);
  assert.equal(message.includes("credential-value"), false);
  assert.equal(message.includes("20260820T000000Z"), false);
  assert.equal(message.includes("content-type%3Bhost"), false);
  assert.equal(message.includes("signature-value"), false);
  assert.equal(message.includes("security-token-value"), false);
  assert.match(message, /\/public\/preview\/\[redacted\]/);
  assert.match(message, /token=\[redacted\]/);
  assert.match(message, /preview_token=\[redacted\]/);
  assert.match(message, /access_token=\[redacted\]/);
  assert.match(message, /api_key=\[redacted\]/);
  assert.match(message, /"password":"\[redacted\]"/);
  assert.match(message, /Authorization Bearer \[redacted\]/);
  assert.match(message, /refreshToken=\[redacted\]/);
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
          cookie: "preview_token=payload.signature",
          uploadUrl:
            "https://uploads.example.com/object.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=signature-value",
        },
      ],
      ok: true,
      requestUrl:
        "https://web.example.com/preview?preview_token=payload.signature&api_key=api-key-value",
      previewToken: "payload.signature",
    }),
    {
      attempts: [
        {
          authorization: "[redacted]",
          cookie: "[redacted]",
          uploadUrl:
            "https://uploads.example.com/object.png?X-Amz-Algorithm=[redacted]&X-Amz-Signature=[redacted]",
        },
      ],
      ok: true,
      requestUrl:
        "https://web.example.com/preview?preview_token=[redacted]&api_key=[redacted]",
      previewToken: "[redacted]",
    },
  );
});
