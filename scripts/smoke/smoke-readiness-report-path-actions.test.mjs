import assert from "node:assert/strict";
import test from "node:test";
import { readReportPathAction } from "./smoke-readiness-runtime-actions.mjs";

test("smoke readiness report path actions explain unsafe segments", () => {
  assert.equal(
    readReportPathAction({
      area: "report.path",
      issue: "unsafe-segments",
    }),
    "Use only safe SMOKE_REPORT_PATH segments without empty parts, traversal, reserved names, trailing dots, special characters, or .json directories.",
  );
});
