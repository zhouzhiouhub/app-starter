import assert from "node:assert/strict";
import test from "node:test";
import {
  readPublishPreflightFieldDomId,
  readPublishPreflightFieldProps,
  readPublishPreflightFieldStyle,
} from "../src/features/pages/publish-preflight-field-focus.ts";

test("publish preflight field focus creates stable DOM ids from schema paths", () => {
  assert.equal(
    readPublishPreflightFieldDomId("sections[2].props.images[0].alt"),
    "publish-field:sections[2].props.images[0].alt",
  );
});

test("publish preflight field focus highlights only the matching field", () => {
  assert.equal(
    readPublishPreflightFieldStyle("seo.ogImage", "seo.ogImage").outline,
    "2px solid #1677ff",
  );
  assert.equal(
    readPublishPreflightFieldStyle("seo.canonical", "seo.ogImage").outline,
    "2px solid transparent",
  );
});

test("publish preflight field focus returns marker props", () => {
  const props = readPublishPreflightFieldProps(
    "chrome.header.content.navigation[0].href",
    null,
  );

  assert.equal(
    props.id,
    "publish-field:chrome.header.content.navigation[0].href",
  );
  assert.deepEqual(props.style, {
    borderRadius: 6,
    outline: "2px solid transparent",
    outlineOffset: 2,
    scrollMarginTop: 16,
    transition: "outline-color 180ms ease",
  });
});
