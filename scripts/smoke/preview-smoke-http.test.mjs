import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchJson,
  readErrorMessage,
  readHttpError,
  redactSmokeSecrets,
} from "./preview-smoke-http.mjs";

test("preview smoke HTTP helpers format safe errors", () => {
  assert.equal(
    readHttpError(
      {
        body: {
          error: {
            message: "Token expired.",
          },
        },
        status: 401,
        statusText: "Unauthorized",
      },
      "Public preview API failed.",
    ),
    "Public preview API failed. 401: Token expired.",
  );
  assert.equal(
    readHttpError(
      {
        body: null,
        status: 503,
        statusText: "Service Unavailable",
      },
      "Web preview failed.",
    ),
    "Web preview failed. 503: Service Unavailable",
  );
  assert.equal(readErrorMessage(new Error("network down")), "network down");
  assert.equal(readErrorMessage("plain failure"), "plain failure");
});

test("preview smoke HTTP helpers redact preview tokens from errors", async () => {
  assert.equal(
    redactSmokeSecrets(
      "https://api.example.com/public/preview/payload.signature?secret=shared",
    ),
    "https://api.example.com/public/preview/[redacted]?secret=[redacted]",
  );
  assert.equal(
    readErrorMessage(
      new Error(
        "fetch failed for https://web.example.com/preview?token=payload.signature",
      ),
    ),
    "fetch failed for https://web.example.com/preview?token=[redacted]",
  );
  assert.equal(
    readHttpError(
      {
        body: {
          error: {
            message:
              "Preview failed at /public/preview/payload.signature?token=payload.signature",
          },
        },
        status: 500,
        statusText: "Internal Server Error",
      },
      "Public preview API failed.",
    ),
    "Public preview API failed. 500: Preview failed at /public/preview/[redacted]?token=[redacted]",
  );

  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      "<html>Preview failed for token payload.signature and secret=shared</html>",
      {
        status: 500,
        statusText: "Internal Server Error",
      },
    );

  try {
    await assert.rejects(
      () =>
        fetchJson(
          "https://api.example.com/public/preview/payload.signature?secret=shared",
        ),
      (error) => {
        assert.equal(error instanceof Error, true);
        assert.match(error.message, /\/public\/preview\/\[redacted\]/);
        assert.match(error.message, /secret=\[redacted\]/);
        assert.equal(error.message.includes("payload.signature"), false);
        assert.equal(error.message.includes("secret=shared"), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
