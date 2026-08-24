import assert from "node:assert/strict";
import test from "node:test";
import { adminRequest } from "../src/features/auth/api.ts";
import { AUTH_SESSION_STORAGE_KEY } from "../src/features/auth/constants.ts";

test("admin refresh failures cancel discarded response bodies", async () => {
  const storage = createExpiredSessionStorage();
  const canceledLabels = [];

  await withLocalStorage(storage, async () => {
    await withFetch(async (url) => {
      if (String(url).endsWith("/auth/refresh")) {
        return cancellableResponse(401, "refresh", canceledLabels);
      }

      return cancellableResponse(401, "initial", canceledLabels);
    }, async () => {
      await assert.rejects(
        () => adminRequest("/pages"),
        /Authentication is required/,
      );
    });
  });

  assert.deepEqual(canceledLabels, ["initial", "refresh"]);
  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
});

test("admin retry failures cancel discarded authorization responses", async () => {
  const storage = createExpiredSessionStorage();
  const canceledLabels = [];

  await withLocalStorage(storage, async () => {
    await withFetch(async (url, init) => {
      if (String(url).endsWith("/auth/refresh")) {
        return jsonResponse({
          data: createSession("fresh-access-token", "refresh-token-2"),
        });
      }

      const authorization = new Headers(init?.headers).get("Authorization");
      return cancellableResponse(
        401,
        authorization === "Bearer fresh-access-token" ? "retry" : "initial",
        canceledLabels,
      );
    }, async () => {
      await assert.rejects(
        () => adminRequest("/pages"),
        /Authentication is required/,
      );
    });
  });

  assert.deepEqual(canceledLabels, ["initial", "retry"]);
  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
});

function createExpiredSessionStorage() {
  const storage = createMemoryStorage();

  storage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(createSession("expired-access-token", "refresh-token-1")),
  );

  return storage;
}

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

function cancellableResponse(status, label, canceledLabels) {
  return new Response(
    new ReadableStream({
      cancel() {
        canceledLabels.push(label);
      },
    }),
    { status },
  );
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
