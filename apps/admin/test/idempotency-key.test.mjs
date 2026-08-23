import assert from "node:assert/strict";
import test from "node:test";
import {
  createIdempotencyKey,
  IdempotencyKeyGenerationError,
} from "../src/lib/idempotency-key.ts";

test("idempotency key helper prefers native random UUIDs", () => {
  withCrypto(
    {
      randomUUID() {
        return "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
      },
    },
    () => {
      assert.equal(
        createIdempotencyKey(),
        "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
      );
    },
  );
});

test("idempotency key helper builds UUID v4 values from secure random bytes", () => {
  withCrypto(
    {
      getRandomValues(bytes) {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = index;
        }

        return bytes;
      },
    },
    () => {
      assert.equal(
        createIdempotencyKey(),
        "00010203-0405-4607-8809-0a0b0c0d0e0f",
      );
    },
  );
});

test("idempotency key helper fails without secure randomness", () => {
  withCrypto(undefined, () => {
    assert.throws(() => createIdempotencyKey(), IdempotencyKeyGenerationError);
  });
});

function withCrypto(cryptoValue, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: cryptoValue,
  });

  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "crypto", descriptor);
    } else {
      delete globalThis.crypto;
    }
  }
}
