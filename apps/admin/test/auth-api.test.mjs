import assert from "node:assert/strict";
import test from "node:test";
import {
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
