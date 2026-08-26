import assert from "node:assert/strict";
import test from "node:test";
import { formatSmokeText } from "./smoke-text.mjs";

test("smoke text formatting redacts normalizes and truncates values", () => {
  const value = [
    "Upload failed",
    "Authorization Bearer a.b.c",
    "token=payload.signature",
    "x".repeat(900),
  ].join("\r\n");
  const text = formatSmokeText(value, { maxLength: 120 });

  assert.equal(text.includes("payload.signature"), false);
  assert.equal(text.includes("a.b.c"), false);
  assert.doesNotMatch(text, /[\r\n]/);
  assert.match(text, /^Upload failed/);
  assert.match(text, /\.\.\.$/);
  assert.equal(text.length, 120);
});

test("smoke text formatting uses fallback for empty values", () => {
  assert.equal(
    formatSmokeText("", { fallback: "Unknown smoke failure." }),
    "Unknown smoke failure.",
  );
});
