import assert from "node:assert/strict";

export function assertApiBadRequest(fn, expectedCode) {
  assert.throws(fn, hasApiError(400, expectedCode));
}

export function assertApiConflict(fn, expectedCode) {
  assert.throws(fn, hasApiError(409, expectedCode));
}

function hasApiError(status, expectedCode) {
  return (error) =>
    typeof error.getStatus === "function" &&
    error.getStatus() === status &&
    error.getResponse()?.code === expectedCode;
}
