import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { mapPrismaException } from "../dist/common/prisma-error.js";

test("mapPrismaException turns missing-table errors into 503", () => {
  const exception = new Prisma.PrismaClientKnownRequestError(
    "The table public.IdempotencyRecord does not exist in the current database.",
    {
      clientVersion: "5.22.0",
      code: "P2021",
    },
  );
  const mapped = mapPrismaException(exception);

  assert.equal(mapped?.name, "ServiceUnavailableException");
  assert.equal(mapped.getStatus(), 503);
  assert.match(
    mapped.getResponse().message,
    /prisma:push/,
  );
});

test("mapPrismaException leaves unrelated errors unchanged", () => {
  const exception = new Error("boom");
  assert.equal(mapPrismaException(exception), exception);
});
