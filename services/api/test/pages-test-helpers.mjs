import assert from "node:assert/strict";

export function createPageActor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    scopes: ["page:publish"],
    tenantId: "tenant-1",
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
