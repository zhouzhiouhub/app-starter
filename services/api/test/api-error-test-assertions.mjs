import assert from "node:assert/strict";

export function assertApiBadRequest(fn, expectedCode) {
  return assertApiError(fn, 400, expectedCode);
}

export function assertApiConflict(fn, expectedCode) {
  return assertApiError(fn, 409, expectedCode);
}

function assertApiError(fn, status, expectedCode) {
  let caught;

  assert.throws(fn, (error) => {
    caught = error;
    return hasApiError(status, expectedCode)(error);
  });

  return caught;
}

function hasApiError(status, expectedCode) {
  return (error) =>
    typeof error.getStatus === "function" &&
    error.getStatus() === status &&
    error.getResponse()?.code === expectedCode;
}
