import assert from "node:assert/strict";
import test from "node:test";
import {
  isOversizedResponseBodyError,
  readBoundedResponseText,
} from "./bounded-response-text.mjs";

test("bounded response text formats oversized body errors", async () => {
  let bodyCanceled = false;

  await assert.rejects(
    () =>
      readBoundedResponseText(
        {
          body: {
            async cancel() {
              bodyCanceled = true;
            },
          },
          headers: new Headers({ "Content-Length": "1000001" }),
          async text() {
            throw new Error("oversized responses should not be read");
          },
        },
        {
          label: "JSON",
          url: `https://api.example.com/data?token=payload.signature \u0000${"x".repeat(
            600,
          )}`,
        },
      ),
    (error) => {
      assert.equal(isOversizedResponseBodyError(error), true);
      assert.equal(error.message.length, 520);
      assert.equal(error.message.endsWith("..."), true);
      assert.equal(error.message.includes("\u0000"), false);
      assert.equal(error.message.includes("payload.signature"), false);
      assert.match(error.message, /token=\[redacted\]/);
      return true;
    },
  );

  assert.equal(bodyCanceled, true);
});
