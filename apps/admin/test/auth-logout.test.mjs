import assert from "node:assert/strict";
import test from "node:test";
import { logoutCurrentSession } from "../src/features/auth/api.ts";
import { AUTH_SESSION_STORAGE_KEY } from "../src/features/auth/constants.ts";

const authSession = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  user: {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    roles: ["admin"],
    scopes: ["page:read"],
    tenantId: "tenant-1",
  },
};

test("logout clears local session without waiting for server revocation", async () => {
  const storage = createMemoryStorage();
  let markLogoutStarted;
  let resolveLogout;
  const logoutStarted = new Promise((resolve) => {
    markLogoutStarted = resolve;
  });

  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(authSession));

  await withLocalStorage(storage, async () => {
    await withFetch(async (url, init) => {
      assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
      assert.equal(String(url).endsWith("/auth/logout"), true);
      assert.equal(init?.keepalive, true);
      assert.match(String(init?.body), /refresh-token-1/);
      markLogoutStarted();

      return new Promise((resolve) => {
        resolveLogout = () => resolve(new Response(null, { status: 204 }));
      });
    }, async () => {
      const logout = logoutCurrentSession();
      await logoutStarted;

      const logoutState = await readImmediatePromiseState(logout);
      resolveLogout();
      await logout;

      assert.equal(logoutState, "settled");
      assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
    });
  });
});

test("logout ignores request startup failures after clearing local session", async () => {
  const storage = createMemoryStorage();
  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(authSession));

  await withLocalStorage(storage, async () => {
    await withFetch(() => {
      throw new Error("request startup failed");
    }, async () => {
      await assert.doesNotReject(() => logoutCurrentSession());
    });
  });

  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
});

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

async function readImmediatePromiseState(promise) {
  const pending = Symbol("pending");
  const state = await Promise.race([
    promise.then(
      () => "settled",
      () => "settled",
    ),
    new Promise((resolve) => {
      setTimeout(() => resolve(pending), 0);
    }),
  ]);

  return state === pending ? "pending" : state;
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
