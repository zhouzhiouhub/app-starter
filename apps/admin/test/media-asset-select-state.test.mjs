import assert from "node:assert/strict";
import test from "node:test";
import { readMediaAssetSelectState } from "../src/features/media/media-asset-select-state.ts";

test("media asset select state reports loading and empty image lists", () => {
  assert.equal(
    readMediaAssetSelectState({
      assets: [],
      isLoading: true,
    }).notFoundContent,
    "Loading media assets...",
  );
  assert.equal(
    readMediaAssetSelectState({
      assets: [],
      isLoading: false,
    }).notFoundContent,
    "No active image assets.",
  );
});

test("media asset select state reports load failures", () => {
  const state = readMediaAssetSelectState({
    assets: [],
    error: "Media assets could not be loaded.",
    isLoading: false,
  });

  assert.equal(state.status, "error");
  assert.equal(state.help, "Media assets could not be loaded.");
});

test("media asset select state warns about unavailable selected references", () => {
  const state = readMediaAssetSelectState({
    assets: [{ reference: "media://asset-1" }],
    isLoading: false,
    value: "media://asset-missing",
  });

  assert.equal(state.status, "warning");
  assert.match(state.help ?? "", /not available/);
});
