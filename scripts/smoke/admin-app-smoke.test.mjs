import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAdminApp,
  formatAdminAppAttempt,
  readAdminAppAttempt,
} from "./admin-app-smoke.mjs";

test("admin app smoke accepts static Admin shell HTML", async () => {
  await withFetch(
    async () =>
      new Response('<div id="root"></div><script type="module"></script>', {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 200,
        statusText: "OK",
      }),
    async () => {
      const attempt = await assertAdminApp({
        adminUrl: "https://admin.example.com",
      });

      assert.deepEqual(attempt, {
        bodySnippet: null,
        contentType: "text/html; charset=utf-8",
        hasRootElement: true,
        ok: true,
        status: 200,
        statusText: "OK",
        url: "https://admin.example.com",
      });
    },
  );
});

test("admin app smoke keeps structured diagnostics on failures", async () => {
  await withFetch(
    async () =>
      new Response(
        "<html><body>Not the admin shell token=payload.signature</body></html>",
        {
          headers: { "content-type": "text/html" },
          status: 200,
          statusText: "OK",
        },
      ),
    async () => {
      await assert.rejects(
        () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
        (error) => {
          assert.equal(error.smokeDetails.adminApp.hasRootElement, false);
          assert.equal(error.smokeDetails.adminApp.status, 200);
          assert.equal(
            error.smokeDetails.adminApp.bodySnippet.includes(
              "payload.signature",
            ),
            false,
          );
          return true;
        },
      );
    },
  );
});

test("admin app smoke summarizes request attempts", async () => {
  await withFetch(
    async () => {
      throw new Error("network failed with token=payload.signature");
    },
    async () => {
      const attempt = await readAdminAppAttempt("https://admin.example.com");

      assert.equal(attempt.errorMessage.includes("payload.signature"), false);
      assert.equal(
        formatAdminAppAttempt(attempt),
        "request failed, root element present: false, error: network failed with token=[redacted]",
      );
    },
  );
});

test("admin app smoke fails clearly when Admin URL is missing", async () => {
  await assert.rejects(
    () => assertAdminApp({ adminUrl: null }),
    (error) => {
      assert.equal(error.smokeDetails.adminApp.url, null);
      assert.match(
        error.smokeDetails.adminApp.errorMessage,
        /ADMIN_URL is required/,
      );
      return true;
    },
  );
});

async function withFetch(fetchImpl, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  try {
    await fn();
  } finally {
    globalThis.fetch = previous;
  }
}
