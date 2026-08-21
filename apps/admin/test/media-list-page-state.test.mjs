import assert from "node:assert/strict";
import test from "node:test";
import { readMediaListPageAfterArchive } from "../src/features/media/media-list-page-state.ts";

test("media archive page state keeps the current active page when it remains valid", () => {
  assert.equal(
    readMediaListPageAfterArchive({
      currentPage: 2,
      pageSize: 20,
      status: "active",
      total: 22,
    }),
    2,
  );
});

test("media archive page state moves back when the active page becomes empty", () => {
  assert.equal(
    readMediaListPageAfterArchive({
      currentPage: 2,
      pageSize: 20,
      status: "active",
      total: 21,
    }),
    1,
  );
});

test("media archive page state keeps non-active listing pages stable", () => {
  assert.equal(
    readMediaListPageAfterArchive({
      currentPage: 2,
      pageSize: 20,
      status: "all",
      total: 21,
    }),
    2,
  );
});

test("media archive page state clamps invalid pagination inputs", () => {
  assert.equal(
    readMediaListPageAfterArchive({
      currentPage: 0,
      pageSize: 0,
      status: "active",
      total: 1,
    }),
    1,
  );
});
