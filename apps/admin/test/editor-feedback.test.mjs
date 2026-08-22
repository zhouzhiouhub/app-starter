import assert from "node:assert/strict";
import test from "node:test";
import { createApiRequestError } from "../src/lib/api-error.ts";
import { readEditorErrorFeedback } from "../src/features/pages/editor-feedback.ts";

test("editor feedback labels API rejected requests", () => {
  const feedback = readEditorErrorFeedback(
    createApiRequestError(
      {
        error: {
          code: "MULTI_LOCALE_DISABLED",
          message:
            "Cannot publish locale de-DE while multi-locale is disabled.",
          requestId: "req_locale_123",
        },
      },
      "Publish request failed.",
    ),
  );

  assert.equal(feedback.type, "error");
  assert.match(feedback.message, /^API rejected the request\./);
  assert.match(feedback.message, /MULTI_LOCALE_DISABLED/);
  assert.match(feedback.message, /Request ID: req_locale_123\./);
});

test("editor feedback keeps local validation errors plain", () => {
  const feedback = readEditorErrorFeedback(
    new Error("Page schema is invalid and cannot be saved."),
  );

  assert.equal(feedback.type, "error");
  assert.equal(
    feedback.message,
    "Page schema is invalid and cannot be saved.",
  );
});
