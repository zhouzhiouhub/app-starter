import assert from "node:assert/strict";
import test from "node:test";
import {
  adminHeaderTitle,
  adminMenuItems,
  selectedAdminMenuKey,
} from "../src/features/shell/constants.ts";

test("admin navigation exposes the MVP menu entries in document order", () => {
  assert.deepEqual(
    adminMenuItems.map((item) => item.key),
    [
      "/",
      "/pages",
      "/design-system",
      "/media",
      "/localization",
      "/analytics",
      "/users",
      "/settings",
      "/audit-logs",
    ],
  );
});

test("admin navigation keeps Phase 2 commerce modules hidden", () => {
  const keys = adminMenuItems.map((item) => item.key);

  assert.equal(keys.includes("/products"), false);
  assert.equal(keys.includes("/orders"), false);
  assert.equal(keys.includes("/payments"), false);
});

test("admin navigation selects newly exposed reserved modules", () => {
  assert.equal(selectedAdminMenuKey("/design-system"), "/design-system");
  assert.equal(selectedAdminMenuKey("/analytics"), "/analytics");
  assert.equal(selectedAdminMenuKey("/users"), "/users");
  assert.equal(adminHeaderTitle("/design-system"), "Design System");
  assert.equal(adminHeaderTitle("/analytics/events"), "Analytics");
  assert.equal(adminHeaderTitle("/users/roles"), "Users");
});
