import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness fallback next actions redact secrets", () => {
  const actions = createSmokeReadinessNextActions([
    {
      area: "custom.runtime",
      issue: "unsafe-value",
      message:
        "Fix https://user:password@api.brand.com/health?token=secret-value and Authorization Bearer abc.def.ghi.",
    },
    {
      area: "",
      issue: "missing-message",
      message: "",
    },
  ]);

  assert.deepEqual(actions, [
    {
      action:
        "Fix https://[redacted]@api.brand.com/health?token=[redacted] and Authorization Bearer [redacted]",
      area: "custom.runtime",
    },
    {
      action:
        "Review the production readiness blocker and add a specific remediation action.",
      area: "unknown",
    },
  ]);
});

test("smoke readiness fallback next actions normalize and cap dynamic messages", () => {
  const actions = createSmokeReadinessNextActions([
    {
      area: "custom.runtime",
      issue: "unsafe-value",
      message: `Fix https://api.brand.com/health?token=payload.signature \u0000 ${"x".repeat(
        700,
      )}`,
    },
  ]);
  const [{ action }] = actions;

  assert.equal(action.length, 520);
  assert.equal(action.endsWith("..."), true);
  assert.equal(action.includes("\u0000"), false);
  assert.equal(action.includes("payload.signature"), false);
  assert.match(action, /token=\[redacted\]/);
});
