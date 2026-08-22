import assert from "node:assert/strict";

export function createPageActor(overrides = {}) {
  return {
    email: "admin@example.com",
    id: "user-1",
    scopes: ["page:publish"],
    tenantId: "tenant-1",
    ...overrides,
  };
}

export function createPageVersionResult(input, overrides = {}) {
  return {
    id: "version-2",
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    publishedAt: input.data.publishedAt,
    status: input.data.status,
    version: input.data.version,
    ...overrides,
  };
}

export function createMemoryIdempotencyRecord(calls = []) {
  let storedRecord = null;

  return {
    create(options) {
      calls.push(["create", options.data.scope]);
      storedRecord = {
        id: "idem-1",
        requestHash: options.data.requestHash,
        response: null,
        status: "pending",
      };
      return Promise.resolve({ id: "idem-1" });
    },
    deleteMany() {
      throw new Error("deleteMany should not run for successful idempotency.");
    },
    findUnique(options) {
      calls.push(["findUnique", options.where.tenantId_scope_key.scope]);
      return Promise.resolve(storedRecord);
    },
    update(options) {
      calls.push(["update", options.data.status]);
      storedRecord = {
        ...storedRecord,
        response: options.data.response ?? null,
        status: options.data.status,
      };
      return Promise.resolve(storedRecord);
    },
  };
}

export async function assertApiConflictRejects(fn, expectedCode) {
  let caught;

  await assert.rejects(fn, (error) => {
    caught = error;

    return (
      typeof error.getStatus === "function" &&
      error.getStatus() === 409 &&
      error.getResponse()?.code === expectedCode
    );
  });

  return caught;
}

export function withPageLocale(schema, locale) {
  return {
    ...schema,
    meta: {
      ...schema.meta,
      locale,
    },
  };
}
