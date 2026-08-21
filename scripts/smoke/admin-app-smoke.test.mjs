import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAdminApp,
  formatAdminAppAttempt,
  readAdminAppAttempt,
} from "./admin-app-smoke.mjs";

test("admin app smoke accepts static Admin shell HTML", async () => {
  await withFetch(
    async (url) => {
      if (url === "https://admin.example.com") {
        return new Response(
          '<div id="root"></div><script type="module" src="/assets/admin.js"></script>',
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://admin.example.com/assets/admin.js") {
        return new Response("console.log('admin')", {
          headers: { "content-type": "text/javascript; charset=utf-8" },
          status: 200,
          statusText: "OK",
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
    async () => {
      const attempt = await assertAdminApp({
        adminUrl: "https://admin.example.com",
      });

      assert.deepEqual(attempt, {
        bodySnippet: null,
        contentType: "text/html; charset=utf-8",
        hasHtmlContentType: true,
        hasModuleScript: true,
        hasRootElement: true,
        moduleScriptContentType: "text/javascript; charset=utf-8",
        moduleScriptErrorMessage: null,
        moduleScriptHasJavaScriptContentType: true,
        moduleScriptOk: true,
        moduleScriptStatus: 200,
        moduleScriptStatusText: "OK",
        moduleScriptUrl: "https://admin.example.com/assets/admin.js",
        ok: true,
        status: 200,
        statusText: "OK",
        url: "https://admin.example.com",
      });
    },
  );
});

test("admin app smoke rejects shell HTML without a module asset", async () => {
  await withFetch(
    async () =>
      new Response('<div id="root"></div><script type="module"></script>', {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 200,
        statusText: "OK",
      }),
    async () => {
      await assert.rejects(
        () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
        (error) => {
          assert.equal(error.smokeDetails.adminApp.hasRootElement, true);
          assert.equal(error.smokeDetails.adminApp.hasModuleScript, false);
          assert.match(
            error.message,
            /module script present: false, module script reachable: false/,
          );
          return true;
        },
      );
    },
  );
});

test("admin app smoke rejects unreachable or non-JavaScript module assets", async () => {
  await withFetch(
    async (url) => {
      if (url === "https://admin.example.com") {
        return new Response(
          '<div id="root"></div><script src="/assets/admin.js" type="module"></script>',
          {
            headers: { "content-type": "text/html" },
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://admin.example.com/assets/admin.js") {
        return new Response("not found", {
          headers: { "content-type": "text/html" },
          status: 404,
          statusText: "Not Found",
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
    async () => {
      await assert.rejects(
        () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
        (error) => {
          assert.equal(error.smokeDetails.adminApp.hasModuleScript, true);
          assert.equal(error.smokeDetails.adminApp.moduleScriptOk, false);
          assert.equal(
            error.smokeDetails.adminApp.moduleScriptHasJavaScriptContentType,
            false,
          );
          assert.match(error.message, /module script status: 404 Not Found/);
          return true;
        },
      );
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
          assert.equal(error.smokeDetails.adminApp.hasModuleScript, false);
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
        "request failed, html content: false, root element present: false, module script present: false, module script reachable: false, module script JavaScript: false, error: network failed with token=[redacted]",
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
