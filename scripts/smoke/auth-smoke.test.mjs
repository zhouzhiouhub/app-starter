import assert from "node:assert/strict";
import test from "node:test";
import { loginSmokeAdmin } from "./auth-smoke.mjs";

const input = {
  apiBaseUrl: "https://api.example.com/api/v1",
  email: "owner@example.com",
  password: "ChangeMe123!",
  tenantSlug: "default",
};

test("auth smoke posts credentials and returns the access token", async () => {
  const calls = [];
  const accessToken = await loginSmokeAdmin(input, async (url, init) => {
    calls.push({ init, url });
    return {
      body: { data: { accessToken: "header.payload.signature" } },
      ok: true,
      status: 200,
      statusText: "OK",
      url,
    };
  });

  assert.equal(accessToken, "header.payload.signature");
  assert.equal(calls[0].url, "https://api.example.com/api/v1/auth/login");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    email: "owner@example.com",
    password: "ChangeMe123!",
    tenantSlug: "default",
  });
});

test("auth smoke rejects login redirects without leaking credentials", async () => {
  const calls = [];

  await assert.rejects(
    () =>
      loginSmokeAdmin(input, async (url, init) => {
        calls.push({ init, url });

        return {
          body: null,
          ok: false,
          redirectLocation:
            "https://api.example.com/login?password=ChangeMe123!&token=header.payload.signature",
          status: 302,
          statusText: "Found",
          url,
        };
      }),
    (error) => {
      assert.equal(calls[0].init.redirect, "manual");
      assert.match(error.message, /Login request failed\. 302: Found/);
      assert.match(error.message, /redirect:/);
      assert.equal(error.message.includes("ChangeMe123!"), false);
      assert.equal(error.message.includes("header.payload.signature"), false);
      assert.match(error.message, /password=\[redacted\]/);
      assert.match(error.message, /token=\[redacted\]/);
      return true;
    },
  );
});

test("auth smoke formats login HTTP failures without leaking secrets", async () => {
  await assert.rejects(
    () =>
      loginSmokeAdmin(input, async (url) => ({
        body: {
          error: {
            message: "invalid password token=header.payload.signature",
          },
        },
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        url,
      })),
    (error) => {
      assert.match(error.message, /Login request failed\. 401:/);
      assert.equal(error.message.includes("header.payload.signature"), false);
      assert.match(error.message, /token=\[redacted\]/);
      return true;
    },
  );
});

test("auth smoke rejects successful responses without an access token", async () => {
  await assert.rejects(
    () =>
      loginSmokeAdmin(input, async (url) => ({
        body: { data: {} },
        ok: true,
        status: 200,
        statusText: "OK",
        url,
      })),
    /Login succeeded but did not return an access token/,
  );
});
