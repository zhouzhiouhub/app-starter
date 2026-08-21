import assert from "node:assert/strict";
import test from "node:test";
import { runTenantIdempotent } from "../dist/common/idempotency-record.js";

test("idempotency records keep pending state when completion persistence fails", async () => {
  let storedRecord = null;
  let operationCalls = 0;
  let deleteCalls = 0;
  const prisma = {
    idempotencyRecord: {
      create(options) {
        storedRecord = {
          id: "idem-1",
          requestHash: options.data.requestHash,
          response: null,
          status: "pending",
        };
        return Promise.resolve({ id: "idem-1" });
      },
      deleteMany() {
        deleteCalls += 1;
        return Promise.resolve({ count: 1 });
      },
      findUnique() {
        return Promise.resolve(storedRecord);
      },
      update() {
        return Promise.reject(new Error("idempotency write failed"));
      },
    },
  };

  await assert.rejects(
    () =>
      runTenantIdempotent(prisma, {
        body: { slug: "home" },
        key: "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
        scope: "pages:create",
        tenantId: "tenant-1",
        operation: async () => {
          operationCalls += 1;
          return { data: { id: "page-1" } };
        },
      }),
    /idempotency write failed/,
  );

  assert.equal(operationCalls, 1);
  assert.equal(deleteCalls, 0);
  assert.equal(storedRecord.status, "pending");

  await assert.rejects(
    () =>
      runTenantIdempotent(prisma, {
        body: { slug: "home" },
        key: "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
        scope: "pages:create",
        tenantId: "tenant-1",
        operation: async () => {
          operationCalls += 1;
          return { data: { id: "page-2" } };
        },
      }),
    (error) =>
      error.getStatus?.() === 409 &&
      error.getResponse?.().message ===
        "A request with this Idempotency-Key is already in progress.",
  );
  assert.equal(operationCalls, 1);
});

test("idempotency records clean pending state when the business operation fails", async () => {
  let storedRecord = null;
  let deleteQuery = null;
  const prisma = {
    idempotencyRecord: {
      create(options) {
        storedRecord = {
          id: "idem-1",
          requestHash: options.data.requestHash,
          response: null,
          status: "pending",
        };
        return Promise.resolve({ id: "idem-1" });
      },
      deleteMany(options) {
        deleteQuery = options.where;
        storedRecord = null;
        return Promise.resolve({ count: 1 });
      },
      findUnique() {
        return Promise.resolve(storedRecord);
      },
      update() {
        throw new Error("update should not run after operation failure");
      },
    },
  };

  await assert.rejects(
    () =>
      runTenantIdempotent(prisma, {
        body: { slug: "home" },
        key: "8d0671c4-46f2-49e4-823f-69f9f6dd0ca3",
        scope: "pages:create",
        tenantId: "tenant-1",
        operation: async () => {
          throw new Error("operation failed");
        },
      }),
    /operation failed/,
  );

  assert.deepEqual(deleteQuery, {
    id: "idem-1",
    status: "pending",
  });
  assert.equal(storedRecord, null);
});
