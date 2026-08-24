import assert from "node:assert/strict";
import test from "node:test";
import { assertAdminApp } from "./admin-app-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("admin app smoke rejects redirected shell responses", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    return new Response("", {
      headers: {
        "content-type": "text/html",
        Location:
          "https://admin.example.com/login?token=header.payload.signature",
      },
      status: 302,
      statusText: "Found",
    });
  }, async () => {
    await assert.rejects(
      () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
      (error) => {
        assert.equal(calls[0].init.redirect, "manual");
        assert.equal(error.smokeDetails.adminApp.status, 302);
        assert.equal(
          error.smokeDetails.adminApp.redirectLocation,
          "https://admin.example.com/login?token=[redacted]",
        );
        assert.match(error.message, /redirect:/);
        assert.equal(error.message.includes("header.payload.signature"), false);
        return true;
      },
    );
  });
});

test("admin app smoke rejects redirected module assets", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    if (url === "https://admin.example.com") {
      return new Response(
        '<div id="root"></div><script type="module" src="/assets/admin.js"></script>',
        {
          headers: { "content-type": "text/html" },
          status: 200,
          statusText: "OK",
        },
      );
    }

    return new Response("", {
      headers: {
        Location: "https://admin.example.com/login?token=payload.signature",
      },
      status: 302,
      statusText: "Found",
    });
  }, async () => {
    await assert.rejects(
      () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
      (error) => {
        assert.equal(calls[0].init.redirect, "manual");
        assert.equal(calls[1].init.redirect, "manual");
        assert.equal(error.smokeDetails.adminApp.moduleScriptStatus, 302);
        assert.equal(
          error.smokeDetails.adminApp.moduleScriptRedirectLocation,
          "https://admin.example.com/login?token=[redacted]",
        );
        assert.match(error.message, /module script redirect:/);
        assert.equal(error.message.includes("payload.signature"), false);
        return true;
      },
    );
  });
});

test("admin app smoke reports redirected preload and stylesheet assets", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    if (url === "https://admin.example.com") {
      return new Response(
        [
          '<div id="root"></div>',
          '<link rel="modulepreload" href="/assets/vendor.js">',
          '<link rel="stylesheet" href="/assets/admin.css">',
          '<script type="module" src="/assets/admin.js"></script>',
        ].join(""),
        {
          headers: { "content-type": "text/html" },
          status: 200,
          statusText: "OK",
        },
      );
    }

    if (url === "https://admin.example.com/assets/admin.js") {
      return new Response("console.log('admin')", {
        headers: { "content-type": "text/javascript" },
        status: 200,
        statusText: "OK",
      });
    }

    return new Response("", {
      headers: {
        Location: "https://admin.example.com/login?token=payload.signature",
      },
      status: 302,
      statusText: "Found",
    });
  }, async () => {
    await assert.rejects(
      () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
      (error) => {
        assert.deepEqual(
          calls.map((call) => call.init.redirect),
          ["manual", "manual", "manual", "manual"],
        );
        assert.equal(
          error.smokeDetails.adminApp.modulePreloadFailures[0]
            .redirectLocation,
          "https://admin.example.com/login?token=[redacted]",
        );
        assert.equal(
          error.smokeDetails.adminApp.stylesheetFailures[0].redirectLocation,
          "https://admin.example.com/login?token=[redacted]",
        );
        assert.match(error.message, /modulepreload redirect:/);
        assert.match(error.message, /stylesheet redirect:/);
        assert.equal(error.message.includes("payload.signature"), false);
        return true;
      },
    );
  });
});
