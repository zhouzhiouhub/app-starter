import assert from "node:assert/strict";
import test from "node:test";
import {
  readCdnAction,
  readExternalHostsAction,
} from "./smoke-readiness-media-actions.mjs";

test("smoke readiness media actions explain control-character CDN blockers", () => {
  assert.equal(
    readCdnAction({
      area: "media.cdn",
      issue: "control-character",
    }),
    "Remove control characters from MEDIA_CDN_BASE_URL, including percent-encoded controls in the path.",
  );
});

test("smoke readiness media actions explain control-character external host blockers", () => {
  assert.equal(
    readExternalHostsAction({
      issues: [
        {
          host: null,
          issue: "control-character",
        },
      ],
    }),
    "Fix MEDIA_EXTERNAL_URL_HOSTS: remove control characters from one entry.",
  );
});
