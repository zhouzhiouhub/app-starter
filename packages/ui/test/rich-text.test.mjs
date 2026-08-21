import assert from "node:assert/strict";
import test from "node:test";
import {
  containsSanitizedRichTextMarkup,
  RichText,
  sanitizeRichText,
} from "../dist/index.js";

test("rich text sanitizer keeps basic editorial markup", () => {
  assert.equal(
    sanitizeRichText(
      '<p>Hello <strong>team</strong> <a href="/en/contact">Contact</a></p>',
    ),
    '<p>Hello <strong>team</strong> <a href="/en/contact">Contact</a></p>',
  );
});

test("rich text sanitizer strips scripts, events, and unsafe links", () => {
  assert.equal(
    sanitizeRichText(
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script><a href="javascript:alert(3)">Bad</a>',
    ),
    "<p>Safe</p>Bad",
  );
});

test("rich text sanitizer protects links opened in a new tab", () => {
  assert.equal(
    sanitizeRichText('<a href="https://example.com" target="_blank">Visit</a>'),
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit</a>',
  );
});

test("rich text sanitizer blocks links with control characters", () => {
  assert.equal(
    sanitizeRichText(
      '<a href="https://example.com&#10;javascript:alert(1)">Bad</a>',
    ),
    "Bad",
  );
});

test("rich text component renders sanitized HTML content", () => {
  const node = RichText({
    content: {
      defaultValue:
        '<p>Intro</p><img src=x onerror=alert(1)><a href="tel:+15551234567">Call</a>',
    },
    title: "Details",
  });
  const content = node.props.children[1];

  assert.equal(content.type, "div");
  assert.equal(
    content.props.dangerouslySetInnerHTML.__html,
    '<p>Intro</p><a href="tel:+15551234567">Call</a>',
  );
});

test("rich text sanitizer reports markup that will be rewritten", () => {
  assert.equal(
    containsSanitizedRichTextMarkup(
      '<p>Hello <strong>team</strong> <a href="/en/contact">Contact</a></p>',
    ),
    false,
  );
  assert.equal(
    containsSanitizedRichTextMarkup('<p onclick="alert(1)">Safe</p>'),
    true,
  );
  assert.equal(
    containsSanitizedRichTextMarkup('<a href="javascript:alert(1)">Bad</a>'),
    true,
  );
  assert.equal(
    containsSanitizedRichTextMarkup(
      '<a href="/en/contact" data-track="footer">Contact</a>',
    ),
    true,
  );
  assert.equal(
    containsSanitizedRichTextMarkup(
      '<a href="/en/download" download>Download</a>',
    ),
    true,
  );
  assert.equal(
    containsSanitizedRichTextMarkup(
      '<a href="/en/contact" href="/en/backup">Contact</a>',
    ),
    true,
  );
  assert.equal(
    containsSanitizedRichTextMarkup(
      '<a href="/en/contact" target="_blank" target="_self">Contact</a>',
    ),
    true,
  );
});
