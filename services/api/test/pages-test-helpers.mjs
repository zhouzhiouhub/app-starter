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

export async function assertApiConflictRejects(fn, expectedCode) {
  await assert.rejects(
    fn,
    (error) =>
      typeof error.getStatus === "function" &&
      error.getStatus() === 409 &&
      error.getResponse()?.code === expectedCode,
  );
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
