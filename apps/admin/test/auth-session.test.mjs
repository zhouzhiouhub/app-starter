import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from "../src/features/auth/auth-session.ts";
import { AUTH_SESSION_STORAGE_KEY } from "../src/features/auth/constants.ts";

const authSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    roles: ["admin"],
    scopes: ["pages:write"],
    tenantId: "tenant-1",
  },
};

test("auth session storage reads and writes valid sessions", () => {
  withLocalStorage(createMemoryStorage(), () => {
    writeAuthSession(authSession);

    assert.deepEqual(readAuthSession(), authSession);
  });
});

test("auth session storage ignores malformed sessions", () => {
  withLocalStorage(createMemoryStorage(), (storage) => {
    storage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: "access-token",
        user: { id: "user-1" },
      }),
    );

    assert.equal(readAuthSession(), null);
  });
});

test("auth session storage tolerates blocked reads", () => {
  withLocalStorage(
    {
      getItem() {
        throw new Error("storage blocked");
      },
      removeItem() {},
      setItem() {},
    },
    () => {
      assert.equal(readAuthSession(), null);
    },
  );
});

test("auth session storage tolerates inaccessible storage APIs", () => {
  withBlockedLocalStorage(() => {
    assert.equal(readAuthSession(), null);
    assert.doesNotThrow(() => writeAuthSession(authSession));
    assert.doesNotThrow(() => clearAuthSession());
  });
});

test("auth session storage tolerates blocked writes and clears", () => {
  withLocalStorage(
    {
      getItem() {
        return null;
      },
      removeItem() {
        throw new Error("storage blocked");
      },
      setItem() {
        throw new Error("quota exceeded");
      },
    },
    () => {
      assert.doesNotThrow(() => writeAuthSession(authSession));
      assert.doesNotThrow(() => clearAuthSession());
    },
  );
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

function withBlockedLocalStorage(callback) {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage blocked");
    },
  });

  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
}

function withLocalStorage(storage, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  try {
    callback(storage);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
}
