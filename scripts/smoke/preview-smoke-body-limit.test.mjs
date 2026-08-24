import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWebPreviewAttempt,
  readWebPreviewAttempt,
} from "./preview-smoke.mjs";
import { assertWebPreview } from "./preview-smoke-render-checks.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

const oversizedPreviewBodyMessage =
  "https://web.example.com/preview?token=[redacted] returned a preview response body larger than 1000000 bytes.";

test("preview smoke helpers summarize oversized web preview attempts", () => {
  const oversized = readWebPreviewAttempt(
    {
      bodyReadError: oversizedPreviewBodyMessage,
      ok: true,
      status: 200,
      statusText: "OK",
      text: "",
    },
    "Draft title",
  );

  assert.deepEqual(oversized, {
    bodyReadError: oversizedPreviewBodyMessage,
    bodySnippet: null,
    diagnosis: "response-body-too-large",
    noIndex: false,
    ok: false,
    status: 200,
    statusText: "OK",
    titlePresent: false,
  });
  assert.equal(
    formatWebPreviewAttempt(oversized),
    `status 200 OK, diagnosis: response-body-too-large, title present: false, noindex: false, body read error: ${oversizedPreviewBodyMessage}`,
  );
});

test("web preview smoke reports oversized preview responses", async () => {
  await withFetch(
    async () =>
      new Response("x".repeat(1_000_001), {
        status: 200,
        statusText: "OK",
      }),
    async () => {
      await assert.rejects(
        () =>
          assertWebPreview(
            {
              retryAttempts: 1,
              retryDelayMs: 1,
              webUrl: "https://web.example.com",
            },
            "payload.signature",
            "Draft title",
          ),
        (error) => {
          assert.equal(error.message.includes("response-body-too-large"), true);
          assert.deepEqual(error.smokeDetails.webPreview, {
            bodyReadError: oversizedPreviewBodyMessage,
            bodySnippet: null,
            diagnosis: "response-body-too-large",
            expectedTitle: "Draft title",
            noIndex: false,
            ok: false,
            status: 200,
            statusText: "OK",
            titlePresent: false,
            url: "https://web.example.com/preview?token=[redacted]",
          });

          return true;
        },
      );
    },
  );
});
