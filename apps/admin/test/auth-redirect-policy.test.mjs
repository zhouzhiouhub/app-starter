import assert from "node:assert/strict";
import test from "node:test";
import {
  adminRequest,
  loginWithPassword,
  logoutCurrentSession,
} from "../src/features/auth/api.ts";
import { AUTH_SESSION_STORAGE_KEY } from "../src/features/auth/constants.ts";

test("auth API requests do not automatically follow redirects", async () => {
  const storage = createMemoryStorage();
  const calls = [];
  let mediaAttempts = 0;

  await withLocalStorage(storage, async () => {
    await withFetch(async (url, init = {}) => {
      const requestPath = readRequestPath(String(url));

      calls.push({
        path: requestPath,
        redirect: init.redirect,
      });

      if (requestPath === "/auth/login") {
        return jsonResponse({
          data: createSession("access-token-1", "refresh-token-1"),
        });
      }

      if (requestPath === "/pages") {
        return jsonResponse({ data: { ok: true } });
      }

      if (requestPath === "/media") {
        mediaAttempts += 1;

        if (mediaAttempts === 1) {
          return new Response("", { status: 401 });
        }

        return jsonResponse({ data: { ok: true } });
      }

      if (requestPath === "/auth/refresh") {
        return jsonResponse({
          data: createSession("access-token-2", "refresh-token-2"),
        });
      }

      if (requestPath === "/auth/logout") {
        return jsonResponse({ data: { ok: true } });
      }

      return new Response("", { status: 404 });
    }, async () => {
      await loginWithPassword({
        email: "admin@example.com",
        password: "ChangeMe123!",
      });
      await adminRequest("/pages", { redirect: "follow" });
      await adminRequest("/media");
      await logoutCurrentSession();
    });
  });

  assert.deepEqual(
    calls.map((call) => call.path),
    [
      "/auth/login",
      "/pages",
      "/media",
      "/auth/refresh",
      "/media",
      "/auth/logout",
    ],
  );

  for (const call of calls) {
    assert.equal(call.redirect, "manual", call.path);
  }

  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
});

function createSession(accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    user: {
      email: "admin@example.com",
      id: "user-1",
      name: "Admin",
      roles: ["admin"],
      scopes: ["page:read"],
      tenantId: "tenant-1",
    },
  };
}

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function readRequestPath(url) {
  return url.replace(/^.*\/api\/v1/u, "");
}

async function withFetch(fetchImplementation, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}

async function withLocalStorage(storage, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  try {
    return await callback(storage);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
}
