import assert from "node:assert/strict";
import test from "node:test";
import { readAuthApiErrorMessage } from "../src/features/auth/api.ts";

test("auth API error messages redact secrets from server messages", () => {
  const message = readAuthApiErrorMessage(
    {
      error: {
        message:
          "Login failed with Authorization: Bearer header.payload.signature and redirect=https://auth.example.com/callback#access_token=fragment-token",
      },
    },
    "Login failed.",
  );

  assert.equal(message.includes("header.payload.signature"), false);
  assert.equal(message.includes("fragment-token"), false);
  assert.match(message, /Authorization: Bearer \[redacted\]/);
  assert.match(message, /#access_token=\[redacted\]/);
});

test("auth API error messages redact string arrays and tolerate null errors", () => {
  assert.equal(
    readAuthApiErrorMessage(
      {
        message: [
          "token=payload.signature",
          "password=ChangeMe123!",
        ],
      },
      "Login failed.",
    ),
    "token=[redacted]; password=[redacted]",
  );
  assert.equal(
    readAuthApiErrorMessage({ error: null }, "Login failed."),
    "Login failed.",
  );
});
