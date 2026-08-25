import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { GUARDS_METADATA } from "@nestjs/common/constants.js";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";
import { REQUIRE_SCOPES_KEY } from "../dist/common/require-scopes.decorator.js";
import { PagesController } from "../dist/modules/pages/pages.controller.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  scopes: ["page:read"],
  tenantId: "tenant-1",
};

test("pages version history controller keeps admin guard and read scope", () => {
  const guards = Reflect.getMetadata(GUARDS_METADATA, PagesController);
  const scopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    PagesController.prototype.listVersions,
  );

  assert.deepEqual(guards, [AdminApiGuard]);
  assert.deepEqual(scopes, ["page:read"]);
});

test("pages version history controller forwards pagination query", async () => {
  const calls = [];
  const controller = new PagesController({
    listVersions: async (...args) => {
      calls.push(args);
      return {
        data: [],
        meta: {
          limit: 10,
          page: 2,
          pageId: args[0],
          requestId: args[3],
          total: 0,
        },
      };
    },
  });

  const response = await controller.listVersions(
    actor,
    "page-1",
    "2",
    "10",
    "request-version-controller",
  );

  assert.deepEqual(calls, [
    [
      "page-1",
      { limit: "10", page: "2" },
      actor,
      "request-version-controller",
    ],
  ]);
  assert.equal(response.meta.requestId, "request-version-controller");
});
