import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  commerceDisabledReservedPhase,
  commerceDisabledWritable,
  commerceReservedDetailAvailable,
  commerceReservedDetailPhase,
  commerceReservedDetailWritable,
  createCommerceDisabledDetails,
  createCommerceReservedDetailDetails,
} from "../dist/index.js";

test("commerce disabled details expose a stable safe contract", () => {
  assert.deepEqual(
    createCommerceDisabledDetails({
      action: "checkout",
      commerceEnabled: false,
      resource: "checkout",
    }),
    {
      action: "checkout",
      commerceEnabled: false,
      reservedPhase: commerceDisabledReservedPhase,
      resource: "checkout",
      writable: commerceDisabledWritable,
      writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
    },
  );
});

test("commerce reserved detail contract exposes stable safe details", () => {
  assert.deepEqual(
    createCommerceReservedDetailDetails({
      commerceEnabled: false,
      resource: "order",
      surface: "admin",
    }),
    {
      action: "read",
      available: commerceReservedDetailAvailable,
      commerceEnabled: false,
      readUnavailableCode: apiErrorCodes.NOT_FOUND,
      reservedPhase: commerceReservedDetailPhase,
      resource: "order",
      surface: "admin",
      writable: commerceReservedDetailWritable,
    },
  );
});
