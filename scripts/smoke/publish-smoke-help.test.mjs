import assert from "node:assert/strict";
import test from "node:test";
import { printHelp } from "./publish-smoke-help.mjs";

test("publish smoke help explains report path production readiness", () => {
  const originalLog = console.log;
  const messages = [];

  try {
    console.log = (message) => messages.push(String(message));

    printHelp();
  } finally {
    console.log = originalLog;
  }

  assert.equal(messages.length, 1);
  assert.match(messages[0], /SMOKE_REPORT_PATH/);
  assert.match(messages[0], /Optional for local runs/);
  assert.match(messages[0], /required for production readiness/);
});
