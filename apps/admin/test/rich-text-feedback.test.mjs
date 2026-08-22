import assert from "node:assert/strict";
import test from "node:test";
import { readRichTextFeedback } from "../src/features/pages/rich-text-feedback.ts";

test("rich text feedback accepts supported editorial markup", () => {
  assert.deepEqual(
    readRichTextFeedback(
      '<p>Hello <strong>team</strong> <a href="/en/contact">Contact</a></p>',
    ),
    {},
  );
});

test("rich text feedback warns about unsafe and unsupported markup", () => {
  assert.equal(
    readRichTextFeedback(
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script>',
    ).status,
    "warning",
  );
  assert.equal(
    readRichTextFeedback('<img src="/x.jpg" onerror="alert(1)">').status,
    "warning",
  );
});

test("rich text feedback warns about unsafe links", () => {
  assert.equal(
    readRichTextFeedback('<a href="javascript:alert(1)">Bad</a>').status,
    "warning",
  );
  assert.equal(
    readRichTextFeedback(
      '<a href="https://example.com&#10;javascript:alert(1)">Bad</a>',
    ).status,
    "warning",
  );
});

test("rich text feedback warns about new-tab links rewritten with rel", () => {
  assert.equal(
    readRichTextFeedback(
      '<a href="https://example.com" target="_blank">Visit</a>',
    ).status,
    "warning",
  );
});
