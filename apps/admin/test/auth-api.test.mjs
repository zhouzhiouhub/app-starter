import assert from "node:assert/strict";
import test from "node:test";
import {
  adminRequest,
  loginWithPassword,
  readAuthApiErrorMessage,
} from "../src/features/auth/api.ts";
import { AUTH_SESSION_STORAGE_KEY } from "../src/features/auth/constants.ts";

test("auth API error messages redact secrets from server messages", () => {
  const message = readAuthApiErrorMessage(
    {
      error: {
        message:
          "Login failed with Authorization: Bearer header.payload.signature and redirect=https://auth.example.com/callback#access_token=fragment-token",
      },
    },
    "Login failed.",
  );

  assert.equal(message.includes("header.payload.signature"), false);
  assert.equal(message.includes("fragment-token"), false);
  assert.match(message, /Authorization: Bearer \[redacted\]/);
  assert.match(message, /#access_token=\[redacted\]/);
});

test("auth API error messages redact string arrays and tolerate null errors", () => {
  assert.equal(
    readAuthApiErrorMessage(
      {
        message: [
          "token=payload.signature",
          "password=ChangeMe123!",
        ],
      },
      "Login failed.",
    ),
    "token=[redacted]; password=[redacted]",
  );
  assert.equal(
    readAuthApiErrorMessage({ error: null }, "Login failed."),
    "Login failed.",
  );
});

test("auth API rejects malformed session responses before storage", async () => {
  const storage = createMemoryStorage();

  await withLocalStorage(storage, async () => {
    await withFetch(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              accessToken: "access-token\nx-header: leaked",
              refreshToken: "refresh-token",
              user: {
                email: "admin@example.com",
                id: "user-1",
                name: "Admin",
                roles: ["admin"],
                scopes: ["page:read"],
                tenantId: "tenant-1",
              },
            },
          }),
          { status: 200 },
        ),
      async () => {
        await assert.rejects(
          () =>
            loginWithPassword({
              email: "admin@example.com",
              password: "ChangeMe123!",
            }),
          /Login failed/,
        );
      },
    );
  });

  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
});

test("admin requests share one refresh when access tokens expire together", async () => {
  const storage = createMemoryStorage();
  const calls = [];

  storage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token-1",
      user: {
        email: "admin@example.com",
        id: "user-1",
        name: "Admin",
        roles: ["admin"],
        scopes: ["page:read"],
        tenantId: "tenant-1",
      },
    }),
  );

  await withLocalStorage(storage, async () => {
    await withFetch(async (url, init) => {
      calls.push({
        authorization: new Headers(init?.headers).get("Authorization"),
        body: init?.body,
        url: String(url),
      });

      if (String(url).endsWith("/auth/refresh")) {
        return jsonResponse({
          data: {
            accessToken: "fresh-access-token",
            refreshToken: "refresh-token-2",
            user: {
              email: "admin@example.com",
              id: "user-1",
              name: "Admin",
              roles: ["admin"],
              scopes: ["page:read"],
              tenantId: "tenant-1",
            },
          },
        });
      }

      if (
        new Headers(init?.headers).get("Authorization") ===
        "Bearer fresh-access-token"
      ) {
        return jsonResponse({ data: { ok: true } });
      }

      return new Response("", { status: 401 });
    }, async () => {
      const responses = await Promise.all([
        adminRequest("/pages"),
        adminRequest("/media"),
      ]);

      assert.equal(responses[0].ok, true);
      assert.equal(responses[1].ok, true);
    });
  });

  assert.equal(
    calls.filter((call) => call.url.endsWith("/auth/refresh")).length,
    1,
  );
  assert.equal(
    calls.filter((call) => call.authorization === "Bearer expired-access-token")
      .length,
    2,
  );
  assert.equal(
    calls.filter((call) => call.authorization === "Bearer fresh-access-token")
      .length,
    2,
  );
  assert.match(
    String(calls.find((call) => call.url.endsWith("/auth/refresh"))?.body),
    /refresh-token-1/,
  );
});

test("admin refresh does not restore sessions changed while refresh is in flight", async () => {
  const storage = createMemoryStorage();
  let markRefreshStarted;
  let resolveRefresh;
  const refreshStarted = new Promise((resolve) => {
    markRefreshStarted = resolve;
  });

  storage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token-1",
      user: {
        email: "admin@example.com",
        id: "user-1",
        name: "Admin",
        roles: ["admin"],
        scopes: ["page:read"],
        tenantId: "tenant-1",
      },
    }),
  );

  await withLocalStorage(storage, async () => {
    await withFetch(async (url) => {
      if (String(url).endsWith("/auth/refresh")) {
        storage.removeItem(AUTH_SESSION_STORAGE_KEY);
        markRefreshStarted();

        return new Promise((resolve) => {
          resolveRefresh = () =>
            resolve(
              jsonResponse({
                data: {
                  accessToken: "fresh-access-token",
                  refreshToken: "refresh-token-2",
                  user: {
                    email: "admin@example.com",
                    id: "user-1",
                    name: "Admin",
                    roles: ["admin"],
                    scopes: ["page:read"],
                    tenantId: "tenant-1",
                  },
                },
              }),
            );
        });
      }

      return new Response("", { status: 401 });
    }, async () => {
      const request = adminRequest("/pages");
      await refreshStarted;
      resolveRefresh();

      await assert.rejects(request, /Authentication is required/);
    });
  });

  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
});

test("admin refresh failures clear stale sessions", async () => {
  for (const createRefreshResponse of [
    async () => {
      throw new Error("network failed");
    },
    async () =>
      jsonResponse({
        data: {
          accessToken: "fresh access token",
          refreshToken: "refresh-token-2",
          user: {
            email: "admin@example.com",
            id: "user-1",
            name: "Admin",
            roles: ["admin"],
            scopes: ["page:read"],
            tenantId: "tenant-1",
          },
        },
      }),
  ]) {
    const storage = createMemoryStorage();

    storage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: "expired-access-token",
        refreshToken: "refresh-token-1",
        user: {
          email: "admin@example.com",
          id: "user-1",
          name: "Admin",
          roles: ["admin"],
          scopes: ["page:read"],
          tenantId: "tenant-1",
        },
      }),
    );

    await withLocalStorage(storage, async () => {
      await withFetch(async (url) => {
        if (String(url).endsWith("/auth/refresh")) {
          return createRefreshResponse();
        }

        return new Response("", { status: 401 });
      }, async () => {
        await assert.rejects(
          () => adminRequest("/pages"),
          /Authentication is required/,
        );
      });
    });

    assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), null);
  }
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

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
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
