import assert from "node:assert/strict";
import test from "node:test";
import { readErrorMessage } from "./publish-smoke.mjs";
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
      "https://uploads.example.com/object.png?X-Amz-Credential=credential-value&X-Amz-Signature=signature-value&X-Amz-Security-Token=security-token-value",
    ].join(" "),
  );

  assert.equal(message.includes("payload.signature"), false);
  assert.equal(message.includes("ChangeMe456!"), false);
  assert.equal(message.includes("shared"), false);
  assert.equal(message.includes("refresh-token-value"), false);
  assert.equal(message.includes("credential-value"), false);
  assert.equal(message.includes("signature-value"), false);
  assert.equal(message.includes("security-token-value"), false);
  assert.match(message, /\/public\/preview\/\[redacted\]/);
  assert.match(message, /token=\[redacted\]/);
  assert.match(message, /"password":"\[redacted\]"/);
  assert.match(message, /Authorization Bearer \[redacted\]/);
  assert.match(message, /refreshToken=\[redacted\]/);
  assert.match(message, /X-Amz-Credential=\[redacted\]/);
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
          uploadUrl:
            "https://uploads.example.com/object.png?X-Amz-Signature=signature-value",
        },
      ],
      ok: true,
      previewToken: "payload.signature",
    }),
    {
      attempts: [
        {
          authorization: "[redacted]",
          uploadUrl:
            "https://uploads.example.com/object.png?X-Amz-Signature=[redacted]",
        },
      ],
      ok: true,
      previewToken: "[redacted]",
    },
  );
});
