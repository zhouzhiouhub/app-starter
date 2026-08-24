import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { GUARDS_METADATA } from "@nestjs/common/constants.js";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";
import { REQUIRE_SCOPES_KEY } from "../dist/common/require-scopes.decorator.js";
import { AdminPagesController } from "../dist/modules/public/admin-pages.controller.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  scopes: ["page:publish"],
  tenantId: "tenant-1",
};
const idempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";

test("legacy admin slug publish controller keeps admin guard and publish scope", () => {
  const guards = Reflect.getMetadata(GUARDS_METADATA, AdminPagesController);
  const scopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminPagesController.prototype.publishPage,
  );

  assert.deepEqual(guards, [AdminApiGuard]);
  assert.deepEqual(scopes, ["page:publish"]);
});

test("legacy admin slug publish controller forwards actor and idempotency key", async () => {
  const calls = [];
  const controller = new AdminPagesController({
    publishBySlug: async (...args) => {
      calls.push(args);
      return { data: { slug: args[0] }, meta: { requestId: args[4] } };
    },
  });

  const response = await controller.publishPage(
    actor,
    "request-legacy-publish",
    { title: "Campaign" },
    idempotencyKey,
    "campaign",
  );

  assert.deepEqual(calls, [
    [
      "campaign",
      { title: "Campaign" },
      idempotencyKey,
      actor,
      "request-legacy-publish",
    ],
  ]);
  assert.deepEqual(response, {
    data: { slug: "campaign" },
    meta: { requestId: "request-legacy-publish" },
  });
});
