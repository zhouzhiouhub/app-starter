import assert from "node:assert/strict";
import test from "node:test";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";

test("admin API guard allows local development and test runtimes", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    const guard = new AdminApiGuard();

    process.env.NODE_ENV = "development";
    assert.equal(guard.canActivate({}), true);

    process.env.NODE_ENV = "test";
    assert.equal(guard.canActivate({}), true);
  } finally {
    restoreNodeEnv(originalNodeEnv);
  }
});

test("admin API guard fails closed in production", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    const guard = new AdminApiGuard();

    process.env.NODE_ENV = "production";
    assert.throws(() => guard.canActivate({}), {
      name: "ForbiddenException",
    });
  } finally {
    restoreNodeEnv(originalNodeEnv);
  }
});

function restoreNodeEnv(value) {
  if (value === undefined) {
    delete process.env.NODE_ENV;
    return;
  }

  process.env.NODE_ENV = value;
}
